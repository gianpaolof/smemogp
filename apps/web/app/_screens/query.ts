import { TORINO } from "@smemogp/db/constants";
import type { EventsQuery } from "@/data/events";
import { periodBounds, rangeBounds } from "@/domain/time";
import type { Filters } from "@/domain/types";

/** Filters + ora corrente → argomenti (stabili per tutta la giornata) della query cache-ata. */
export function buildQuery(f: Filters, now: Date): { query: EventsQuery; from: Date } {
  const bounds = f.period === "custom" && f.range ? rangeBounds(f.range.from, f.range.to) : periodBounds(f.period as any, now);
  // Un intervallo che parte nel passato (link vecchio) comincia oggi
  const today = periodBounds("oggi", now).from;
  const from = bounds.from < today ? today : bounds.from;
  const to = bounds.to;
  const origin = f.origin ?? TORINO;
  return {
    from,
    query: {
      lat: origin.lat,
      lng: origin.lng,
      radiusKm: f.radiusKm,
      fromIso: from.toISOString(),
      toIso: to.toISOString(),
      categories: [...f.categories].sort(),
    },
  };
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;
