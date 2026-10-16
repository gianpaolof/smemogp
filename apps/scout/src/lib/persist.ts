import { and, eq, inArray, sql } from "drizzle-orm";
import { eventSources, events, type Db, type NewEvent } from "@smemogp/db";
import type { RawEvent, Source } from "../types";
import { archiveAndDelete } from "./archive";
import { chooseId, findMatch, loadCandidates, type Comparable } from "./dedup";
import { exclusionReason } from "./exclude";
import { geocode } from "./geocode";
import { toNewEvent } from "./normalize";

export type PersistStats = { saved: number; merged: number; excluded: number; stale: number; past: number };

/** Stesse regole dell'upsert, per duplicati dentro lo stesso lotto. */
function mergeRows(a: NewEvent, b: NewEvent): NewEvent {
  const timed = a.allDay && !b.allDay ? b : a;
  const filled = Object.fromEntries(Object.entries(b).filter(([, v]) => v != null));
  return { ...a, ...filled, startsAt: timed.startsAt, allDay: timed.allDay };
}

/**
 * Dal più preciso al più generico. Nominatim spesso non trova «nome sala + indirizzo»
 * (es. «il Circolo dei lettori, via Bogino 9») ma trova l'indirizzo da solo.
 */
export function geocodeQueries(row: Pick<NewEvent, "venueName" | "address" | "city">): string[] {
  const join = (...parts: (string | null | undefined)[]) => {
    const seen = new Set<string>();
    return parts
      .flatMap((p) => (p ?? "").split(","))
      .map((p) => p.trim())
      .filter((p) => p && !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase()))
      .join(", ");
  };
  const city = row.city ?? "Piemonte";
  const queries = [join(row.venueName, row.address, city), join(row.address, city), join(row.venueName, city)];
  return [...new Set(queries.filter((q) => q && q !== city))];
}

/**
 * Eventi già salvati che un evento ora escluso aggiornerebbe (es. arriva la descrizione
 * «per bambini»). Serve la stessa provenienza esatta (fonte + URL) e, su quella, la dedup:
 * stesso id oppure stesso evento per `findMatch`. Mai la sola somiglianza del titolo.
 */
async function findStale(db: Db, sourceId: string, excluded: { row: NewEvent; reason: string }[]) {
  if (!excluded.length) return [];
  const linked = await db
    .select({
      url: eventSources.url,
      id: events.id,
      title: events.title,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      venueName: events.venueName,
      city: events.city,
      lat: events.lat,
      lng: events.lng,
    })
    .from(eventSources)
    .innerJoin(events, eq(events.id, eventSources.eventId))
    .where(and(eq(eventSources.sourceId, sourceId), inArray(eventSources.url, [...new Set(excluded.map((x) => x.row.url))])))
    .all();
  const stale = new Map<string, { id: string; title: string; reason: string }>();
  for (const { row, reason } of excluded) {
    const sameUrl = linked.filter((l) => l.url === row.url);
    const hit = sameUrl.find((l) => l.id === row.id) ?? findMatch({ ...row, id: row.id! }, sameUrl);
    if (hit) stale.set(hit.id, { id: hit.id, title: hit.title, reason });
  }
  return [...stale.values()];
}

/** Inizio di oggi a Roma (con margine): eventi finiti prima non si salvano. */
export const startOfTodayRome = () => new Date(Date.now() - 24 * 3600 * 1000);

/**
 * Unico punto di scrittura degli eventi, per scout online e ingest della skill:
 * normalizza → esclusioni → geocoding → dedup cross-fonte → upsert + provenienza.
 */
export async function persistEvents(
  db: Db,
  source: Pick<Source, "id" | "category">,
  raw: RawEvent[],
  // Cancellare ciò che era già salvato è da attivare esplicitamente (SCOUT_REMOVE_EXCLUDED=1)
  { dryRun = false, removeStale = process.env.SCOUT_REMOVE_EXCLUDED === "1" } = {},
): Promise<{ rows: NewEvent[]; stats: PersistStats }> {
  const stats: PersistStats = { saved: 0, merged: 0, excluded: 0, stale: 0, past: 0 };
  const cutoff = startOfTodayRome();
  const rows: NewEvent[] = [];
  const excluded: { row: NewEvent; reason: string }[] = [];

  for (const e of raw) {
    if ((e.endsAt ?? e.startsAt) < cutoff) {
      stats.past++;
      continue;
    }
    const reason = exclusionReason(e);
    if (reason) {
      stats.excluded++;
      console.log(`  escluso «${e.title.slice(0, 60)}» (${reason})`);
      excluded.push({ row: toNewEvent(e, source as Source), reason });
      continue;
    }
    rows.push(toNewEvent(e, source as Source));
  }

  // Le esclusioni valgono anche per ciò che era già stato salvato: archivio + cancellazione
  const stale = await findStale(db, source.id, excluded);
  stats.stale = stale.length;
  const remove = removeStale && !dryRun;
  for (const s of stale) console.log(`  ${remove ? "rimosso" : "da rimuovere (cancellazione non attiva)"} «${s.title.slice(0, 60)}» → ${s.id.slice(0, 8)}`);
  if (remove) await archiveAndDelete(db, stale);

  for (const row of rows) {
    if (row.lat == null && (row.address || row.venueName || row.city)) {
      for (const query of geocodeQueries(row)) {
        const hit = await geocode(db, query).catch(() => null);
        if (hit) {
          Object.assign(row, hit);
          break;
        }
      }
    }
  }

  // Dedup contro il DB e dentro il lotto stesso (stesso evento su due pagine lista)
  const candidates: Comparable[] = await loadCandidates(db, rows);
  const unique = new Map<string, NewEvent>();
  for (const row of rows) {
    const { id, merged } = chooseId({ ...row, id: row.id! }, candidates);
    if (merged) {
      stats.merged++;
      console.log(`  fuso «${row.title.slice(0, 60)}» → ${id.slice(0, 8)}`);
    }
    row.id = id;
    const prev = unique.get(id);
    if (!prev) candidates.push({ ...row, id });
    unique.set(id, prev ? mergeRows(prev, row) : row);
  }
  const final = [...unique.values()];
  if (dryRun) return { rows: final, stats: { ...stats, saved: final.length } };

  // Batch atomici a blocchi da 100: un giro di rete per blocco invece che per istruzione.
  for (let i = 0; i < final.length; i += WRITE_CHUNK)
    await writeChunk(db, source.id, final.slice(i, i + WRITE_CHUNK), i / WRITE_CHUNK);

  return { rows: final, stats: { ...stats, saved: final.length } };
}

const WRITE_CHUNK = 100;

/** Connessione chiusa dal server (undici `UND_ERR_SOCKET`), cercata lungo tutta la catena `cause`. */
export function isClosedSocket(err: unknown) {
  for (let e = err, depth = 0; e && depth < 8; e = (e as { cause?: unknown }).cause, depth++)
    if ((e as { code?: unknown }).code === "UND_ERR_SOCKET") return true;
  return false;
}

/**
 * Evento + provenienza nello stesso batch: mai un evento senza la sua `event_sources`.
 *
 * Un solo nuovo tentativo se il server ha chiuso la connessione: dopo una pausa lunga senza
 * traffico (Vivaticket: ~107 s di dedup su ~900 eventi) Turso chiude la connessione inattiva e
 * il client la riusa (run 38962271756: fallito in 70 ms, stesso blocco riuscito subito dopo).
 * undici scarta il socket guasto, quindi il nuovo tentativo ne apre uno nuovo. È sicuro anche se
 * il primo batch fosse stato applicato con risposta persa: stesse istruzioni (dati, id e
 * timestamp calcolati una volta sola) e upsert che riapplicati danno lo stesso stato; nessun trigger.
 */
async function writeChunk(db: Db, sourceId: string, chunk: NewEvent[], index: number) {
  const now = new Date();
  const writes = chunk.flatMap((row) => [
    db
      .insert(events)
      .values(row)
      .onConflictDoUpdate({
        target: events.id,
        // Non sovrascrivere campi già noti con null da una fonte più povera;
        // l'orario vince sul «tutto il giorno»
        set: {
          title: row.title,
          startsAt: sql`case when ${events.allDay} = 1 and excluded.all_day = 0 then excluded.starts_at else ${events.startsAt} end`,
          allDay: sql`min(${events.allDay}, excluded.all_day)`,
          endsAt: sql`coalesce(excluded.ends_at, ${events.endsAt})`,
          description: sql`coalesce(excluded.description, ${events.description})`,
          venueName: sql`coalesce(${events.venueName}, excluded.venue_name)`,
          address: sql`coalesce(excluded.address, ${events.address})`,
          city: sql`coalesce(${events.city}, excluded.city)`,
          lat: sql`coalesce(${events.lat}, excluded.lat)`,
          lng: sql`coalesce(${events.lng}, excluded.lng)`,
          imageUrl: sql`coalesce(excluded.image_url, ${events.imageUrl})`,
          priceText: sql`coalesce(excluded.price_text, ${events.priceText})`,
          updatedAt: now,
        },
      }),
    db
      .insert(eventSources)
      .values({ eventId: row.id!, sourceId, url: row.url })
      .onConflictDoUpdate({
        target: [eventSources.eventId, eventSources.sourceId],
        set: { url: row.url, lastSeenAt: now },
      }),
  ]);
  if (!writes.length) return;
  const batch = writes as [(typeof writes)[number], ...typeof writes];
  try {
    await db.batch(batch);
  } catch (err) {
    if (!isClosedSocket(err)) throw err;
    console.warn(`  [persist] ${sourceId} blocco ${index}: connessione chiusa dal server, nuovo tentativo`);
    await db.batch(batch);
  }
}
