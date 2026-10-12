import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createDb, findEventById, findEventsNear, haversineKm, TORINO, type Db, type Event } from "@smemogp/db";
import type { Category, EventItem, LatLng } from "@/domain/types";

/** Tag invalidato dallo scout a fine run (`POST /api/revalidate`). */
export const EVENTS_TAG = "events";

let db: Db | undefined;
const getDb = () => (db ??= createDb());

/** Argomenti primitivi: fanno da chiave di cache. */
export type EventsQuery = {
  lat: number;
  lng: number;
  radiusKm: number;
  fromIso: string;
  toIso: string;
  categories: Category[];
};

function toItem(e: Event, origin: LatLng | null): EventItem {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt?.toISOString() ?? null,
    allDay: e.allDay,
    venueName: e.venueName,
    address: e.address,
    city: e.city,
    lat: e.lat!,
    lng: e.lng!,
    category: e.category,
    priceText: e.priceText,
    imageUrl: e.imageUrl,
    url: e.url,
    sourceId: e.sourceId,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    distanceKm: origin && e.lat != null && e.lng != null ? haversineKm(origin, { lat: e.lat, lng: e.lng }) : null,
  };
}

export async function getEvents(q: EventsQuery): Promise<EventItem[]> {
  "use cache";
  cacheTag(EVENTS_TAG);
  cacheLife("hours");

  const rows = await findEventsNear(getDb(), {
    lat: q.lat,
    lng: q.lng,
    radiusKm: q.radiusKm,
    from: new Date(q.fromIso),
    to: new Date(q.toIso),
    categories: q.categories,
  });
  return rows.map((e) => toItem(e, q));
}

export async function getEvent(id: string, origin: LatLng | null): Promise<EventItem | null> {
  "use cache";
  cacheTag(EVENTS_TAG);
  cacheLife("hours");

  const row = await findEventById(getDb(), id);
  if (!row || row.lat == null || row.lng == null) return null;
  return toItem(row, origin ?? TORINO);
}
