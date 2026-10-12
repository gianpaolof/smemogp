import { and, asc, between, eq, gte, inArray, lt, or } from "drizzle-orm";
import type { Db } from "./client";
import type { Category } from "./constants";
import { events, type Event } from "./schema";
import { boundingBox, haversineKm } from "./geo";

export type NearbyQuery = {
  lat: number;
  lng: number;
  radiusKm: number;
  from?: Date;
  to?: Date;
  categories?: Category[];
  limit?: number;
};

export type NearbyEvent = Event & { distanceKm: number };

/** SQLite non ha funzioni geo: prefiltro bbox in SQL, distanza esatta in JS. */
export async function findEventsNear(db: Db, q: NearbyQuery): Promise<NearbyEvent[]> {
  const box = boundingBox(q, q.radiusKm);
  const from = q.from ?? new Date();
  const rows = await db
    .select()
    .from(events)
    .where(
      and(
        between(events.lat, box.minLat, box.maxLat),
        between(events.lng, box.minLng, box.maxLng),
        // Include eventi in corso (es. mostre) oltre a quelli futuri
        or(gte(events.startsAt, from), gte(events.endsAt, from)),
        // `to` esclusivo: [from, to)
        q.to ? lt(events.startsAt, q.to) : undefined,
        q.categories?.length ? inArray(events.category, q.categories) : undefined,
      ),
    )
    .orderBy(asc(events.startsAt))
    .limit(q.limit ?? 500);

  return rows
    .map((e) => ({ ...e, distanceKm: haversineKm(q, { lat: e.lat!, lng: e.lng! }) }))
    .filter((e) => e.distanceKm <= q.radiusKm);
}

export async function findEventById(db: Db, id: string): Promise<Event | undefined> {
  const [row] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return row;
}

/** Più eventi in un'unica `IN (…)`; ordine non garantito. Lista vuota: nessuna query. */
export async function findEventsByIds(db: Db, ids: string[]): Promise<Event[]> {
  if (ids.length === 0) return [];
  return db.select().from(events).where(inArray(events.id, ids));
}
