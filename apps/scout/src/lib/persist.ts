import { sql } from "drizzle-orm";
import { eventSources, events, type Db, type NewEvent } from "@smemogp/db";
import type { RawEvent, Source } from "../types";
import { chooseId, loadCandidates, type Comparable } from "./dedup";
import { exclusionReason } from "./exclude";
import { geocode } from "./geocode";
import { toNewEvent } from "./normalize";

export type PersistStats = { saved: number; merged: number; excluded: number; past: number };

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

/** Inizio di oggi a Roma (con margine): eventi finiti prima non si salvano. */
const startOfTodayRome = () => new Date(Date.now() - 24 * 3600 * 1000);

/**
 * Unico punto di scrittura degli eventi, per scout online e ingest della skill:
 * normalizza → esclusioni → geocoding → dedup cross-fonte → upsert + provenienza.
 */
export async function persistEvents(
  db: Db,
  source: Pick<Source, "id" | "category">,
  raw: RawEvent[],
  { dryRun = false } = {},
): Promise<{ rows: NewEvent[]; stats: PersistStats }> {
  const stats: PersistStats = { saved: 0, merged: 0, excluded: 0, past: 0 };
  const cutoff = startOfTodayRome();
  const rows: NewEvent[] = [];

  for (const e of raw) {
    if ((e.endsAt ?? e.startsAt) < cutoff) {
      stats.past++;
      continue;
    }
    const reason = exclusionReason(e);
    if (reason) {
      stats.excluded++;
      console.log(`  escluso «${e.title.slice(0, 60)}» (${reason})`);
      continue;
    }
    rows.push(toNewEvent(e, source as Source));
  }

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

  await db.transaction(async (tx) => {
    for (const row of final) {
      await tx
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
            updatedAt: new Date(),
          },
        });
      await tx
        .insert(eventSources)
        .values({ eventId: row.id!, sourceId: source.id, url: row.url })
        .onConflictDoUpdate({
          target: [eventSources.eventId, eventSources.sourceId],
          set: { url: row.url, lastSeenAt: new Date() },
        });
    }
  });

  return { rows: final, stats: { ...stats, saved: final.length } };
}
