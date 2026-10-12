import { CATEGORIES } from "@smemogp/db/constants";
import type { Category, Filters, LatLng, Period } from "./types";

export const PERIODS: readonly Period[] = ["stasera", "oggi", "weekend", "settimana", "mese"];
export const RADIUS_MIN_KM = 1;
export const RADIUS_MAX_KM = 100;
/** Valori dello slider: fitti dove servono (in città), radi verso la provincia. */
export const RADIUS_STEPS = [1, 2, 3, 4, 5, 7, 10, 12, 15, 20, 25, 30, 40, 50, 75, 100] as const;

export const DEFAULT_FILTERS: Filters = {
  period: "settimana",
  radiusKm: 10,
  categories: [],
  origin: null,
};

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

function get(params: Params, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/** Coordinate arrotondate a ~100 m: meno chiavi di cache, privacy migliore nell'URL. */
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** URL → Filters. Valori invalidi ricadono sui default, mai errori. */
export function parseFilters(params: Params): Filters {
  const period = get(params, "periodo");
  const radius = Number(get(params, "raggio"));
  const cats = (get(params, "cat") ?? "")
    .split(",")
    .filter((c): c is Category => (CATEGORIES as readonly string[]).includes(c));
  const lat = Number(get(params, "lat"));
  const lng = Number(get(params, "lng"));
  const hasOrigin = Number.isFinite(lat) && Number.isFinite(lng) && get(params, "lat") && get(params, "lng");

  return {
    period: PERIODS.includes(period as Period) ? (period as Period) : DEFAULT_FILTERS.period,
    radiusKm: Number.isFinite(radius) && radius > 0
      ? clamp(Math.round(radius), RADIUS_MIN_KM, RADIUS_MAX_KM)
      : DEFAULT_FILTERS.radiusKm,
    categories: [...new Set(cats)],
    origin: hasOrigin ? { lat: round3(lat), lng: round3(lng) } : null,
  };
}

/** Filters → query string (solo i valori diversi dal default), senza "?". */
export function serializeFilters(f: Filters): string {
  const p = new URLSearchParams();
  if (f.period !== DEFAULT_FILTERS.period) p.set("periodo", f.period);
  if (f.radiusKm !== DEFAULT_FILTERS.radiusKm) p.set("raggio", String(f.radiusKm));
  if (f.categories.length) p.set("cat", [...f.categories].sort().join(","));
  if (f.origin) {
    p.set("lat", String(round3(f.origin.lat)));
    p.set("lng", String(round3(f.origin.lng)));
  }
  return p.toString();
}

export function hrefWith(path: string, f: Filters): string {
  const qs = serializeFilters(f);
  return qs ? `${path}?${qs}` : path;
}

export function toggleCategory(f: Filters, c: Category): Filters {
  const categories = f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c];
  return { ...f, categories };
}

export function withOrigin(f: Filters, origin: LatLng | null): Filters {
  return { ...f, origin };
}
