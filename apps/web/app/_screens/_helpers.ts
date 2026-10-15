import { getEvents, type EventsQuery } from "@/data/events";
import { buildQuery, type SearchParams } from "./query";
import type { Filters } from "@/domain/types";
import { touchesWeekend } from "@/domain/agenda";

export interface LoadEventsResult {
  events: Awaited<ReturnType<typeof getEvents>>;
  from: Date;
}

/**
 * Shared helper: passa per buildQuery (range → bounds), getEvents (fetch),
 * e applica il filtro weekend (post-fetch, puro).
 * Usato da ListScreen, MapRoute, DesktopMapLoader, api/events.
 */
export async function loadEvents(f: Filters, now: Date): Promise<LoadEventsResult> {
  const { query, from, to } = buildQueryWithBounds(f, now);
  const events = await getEvents(query);

  // Post-filtro weekend: non entra nella chiave di cache
  const filtered = f.weekendOnly ? events.filter(e => touchesWeekend(e, from, to)) : events;

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
