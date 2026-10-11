import { and, gte, lte } from "drizzle-orm";
import { events, haversineKm, type Db, type NewEvent } from "@smemogp/db";
import { eventId, normTitle, romeDay, slug } from "./normalize";

// Soglie conservative: meglio un duplicato visibile che due eventi diversi fusi
const TITLE_SIMILARITY = 0.6;
const SAME_PLACE_KM = 0.5;
const FAR_KM = 2;

export type Comparable = Pick<NewEvent, "title" | "startsAt" | "endsAt" | "venueName" | "city" | "lat" | "lng"> & {
  id: string;
};

// Parole che le fonti aggiungono attorno al nome dell'evento: non lo identificano
const GENERIC = new Set(
  "il lo la i gli le un una di del della dei delle a al alla in con per da su e ed the and of at live concerto concerti tour show spettacolo mostra evento festival torino ore".split(" "),
);

const tokens = (title: string) =>
  new Set(
    normTitle(title)
      .split(" ")
      .filter((t) => t.length > 1 && !GENERIC.has(t) && !/^(19|20)\d\d$/.test(t)),
  );

/** Quota di parole significative del titolo più corto presenti nell'altro (0–1). */
export function titleSimilarity(a: string, b: string) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  return common / Math.min(ta.size, tb.size);
}

function distanceKm(a: Comparable, b: Comparable) {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  return haversineKm({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
}

/** Stesso posto, oppure almeno uno dei due senza luogo e città compatibili. */
function samePlace(a: Comparable, b: Comparable) {
  const va = slug(a.venueName ?? "");
  const vb = slug(b.venueName ?? "");
  if (va && vb && (va.includes(vb) || vb.includes(va))) return true;
  const d = distanceKm(a, b);
  if (d != null) return d < SAME_PLACE_KM;
  const unknown = (e: Comparable) => !e.venueName && e.lat == null;
  if (unknown(a) || unknown(b)) {
    const ca = slug(a.city ?? "");
    const cb = slug(b.city ?? "");
    return !ca || !cb || ca === cb;
  }
  return false;
}

/** Stesso giorno (Roma) o, per eventi su più giorni, intervalli sovrapposti. */
function sameWhen(a: Comparable, b: Comparable) {
  if (romeDay(a.startsAt) === romeDay(b.startsAt)) return true;
  const end = (e: Comparable) => e.endsAt ?? e.startsAt;
  return Boolean(a.endsAt || b.endsAt) && a.startsAt <= end(b) && b.startsAt <= end(a);
}

/** Evento già noto che rappresenta lo stesso evento, se c'è. Puro: testabile senza DB. */
export function findMatch(row: Comparable, candidates: Comparable[]): Comparable | undefined {
  return candidates.find(
    (c) => sameWhen(row, c) && titleSimilarity(row.title, c.title) >= TITLE_SIMILARITY && samePlace(row, c),
  );
}

/**
 * Id definitivo: riusa quello di un evento equivalente già in DB; se l'id di base è preso
 * da un omonimo lontano (> 2 km) aggiunge la città per tenerli distinti.
 */
export function chooseId(row: Comparable, candidates: Comparable[]): { id: string; merged: boolean } {
  const match = findMatch(row, candidates);
  if (match) return { id: match.id, merged: match.id !== row.id };
  const taken = candidates.find((c) => c.id === row.id);
  if (taken) {
    const d = distanceKm(row, taken);
    if (d == null || d > FAR_KM) return { id: eventId(row, slug(row.city ?? row.venueName ?? "altrove")), merged: false };
  }
  return { id: row.id, merged: false };
}

const DAY_MS = 24 * 3600 * 1000;

/** Candidati dal DB: eventi che iniziano entro ±1 giorno o in corso (mostre). */
export async function loadCandidates(db: Db, rows: Pick<NewEvent, "startsAt">[]) {
  if (!rows.length) return [];
  const times = rows.map((r) => r.startsAt.getTime());
  const from = new Date(Math.min(...times) - 60 * DAY_MS); // mostre iniziate prima
  const to = new Date(Math.max(...times) + DAY_MS);
  return db
    .select({
      id: events.id,
      title: events.title,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      venueName: events.venueName,
      city: events.city,
      lat: events.lat,
      lng: events.lng,
    })
    .from(events)
    .where(and(gte(events.startsAt, from), lte(events.startsAt, to)))
    .all();
}
