import { getEvents, type EventsQuery } from "@/data/events";
import { buildQuery, type SearchParams } from "./query";
import type { Filters } from "@/domain/types";
import { touchesWeekend } from "@/domain/agenda";
import { matchesQuery } from "@/domain/filters";

export interface LoadEventsResult {
  events: Awaited<ReturnType<typeof getEvents>>;
  from: Date;
}

/**
 * Shared helper: passa per buildQuery (range → bounds), getEvents (fetch),
 * e applica i filtri weekend e testo (post-fetch, puri).
 * Usato da ListScreen, MapRoute, DesktopMapLoader, api/events.
 */
export async function loadEvents(f: Filters, now: Date): Promise<LoadEventsResult> {
  const { query, from, to } = buildQueryWithBounds(f, now);
  const events = await getEvents(query);

  // Post-filtri weekend e testo: non entrano nella chiave di cache
  const filtered = events.filter(
    (e) => (!f.weekendOnly || touchesWeekend(e, from, to)) && matchesQuery(e, f.q),
  );

  return { events: filtered, from };
}

/**
 * Estensione di buildQuery che ritorna anche `to` per il post-filtro weekend.
 */
export function buildQueryWithBounds(f: Filters, now: Date): { query: EventsQuery; from: Date; to: Date } {
  const { query, from } = buildQuery(f, now);
  // Ricava `to` dalla query (fromIso/toIso)
  const to = new Date(query.toIso);
  return { query, from, to };
}
