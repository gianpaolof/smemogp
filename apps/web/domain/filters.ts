import { CATEGORIES } from "@smemogp/db/constants";
import type { Category, EventItem, Filters, LatLng, Period } from "./types";

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
  range: null,
  weekendOnly: false,
  q: "",
};

const MAX_QUERY_LENGTH = 80;

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

function get(params: Params, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/** Coordinate arrotondate a ~100 m: meno chiavi di cache, privacy migliore nell'URL. */
const round3 = (n: number) => Math.round(n * 1000) / 1000;

const MAX_RANGE_DAYS = 60;
const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
const dateIsBefore = (a: string, b: string) => a < b;

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

  // Range parsing: dal/al in YYYY-MM-DD
  const dal = get(params, "dal");
  const al = get(params, "al");
  const validDal = dal && isValidDate(dal) ? dal : null;
  const validAl = al && isValidDate(al) ? al : null;
  const today = new Date().toISOString().split("T")[0];

  let range: { from: string; to: string } | null = null;
  if (validDal) {
    const from = validDal < today ? today : validDal;
    const to = validAl && validAl >= from ? validAl : from;
    const daysDiff = Math.floor((new Date(to).getTime() - new Date(from).getTime()) / (24 * 60 * 60 * 1000));
    if (daysDiff <= MAX_RANGE_DAYS) {
      range = { from, to };
    }
  }

  // Solo weekend modifier
  const solo = get(params, "solo");
  const weekendOnly = range && solo === "weekend" ? true : false;

  // Se c'è un range valido, periodo = "custom"
  const effectivePeriod: Period | "custom" = range ? "custom" :
    (PERIODS.includes(period as Period) ? (period as Period) : DEFAULT_FILTERS.period);

  return {
    period: effectivePeriod,
    radiusKm: Number.isFinite(radius) && radius > 0
      ? clamp(Math.round(radius), RADIUS_MIN_KM, RADIUS_MAX_KM)
      : DEFAULT_FILTERS.radiusKm,
    categories: [...new Set(cats)],
    origin: hasOrigin ? { lat: round3(lat), lng: round3(lng) } : null,
    range,
    weekendOnly,
    q: (get(params, "q") ?? "").trim().replace(/\s+/g, " ").slice(0, MAX_QUERY_LENGTH),
  };
}

/** Filters → query string (solo i valori diversi dal default), senza "?". */
export function serializeFilters(f: Filters): string {
  const p = new URLSearchParams();
  if (f.range) {
    p.set("dal", f.range.from);
    if (f.range.to !== f.range.from) p.set("al", f.range.to);
  } else if (f.period !== DEFAULT_FILTERS.period) {
    p.set("periodo", f.period);
  }
  if (f.radiusKm !== DEFAULT_FILTERS.radiusKm) p.set("raggio", String(f.radiusKm));
  if (f.categories.length) p.set("cat", [...f.categories].sort().join(","));
  if (f.weekendOnly) p.set("solo", "weekend");
  if (f.q) p.set("q", f.q);
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

/** Minuscolo e senza accenti: «città» trova «Citta», «Caffè» trova «caffe». */
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * Ogni parola della ricerca deve comparire (anche come parte di parola) in titolo, descrizione,
 * luogo o città. Query vuota: tutto passa.
 */
export function matchesQuery(
  e: Pick<EventItem, "title" | "description" | "venueName" | "city">,
  q: string,
): boolean {
  const words = fold(q).split(" ").filter(Boolean);
  if (!words.length) return true;
  const text = fold([e.title, e.description, e.venueName, e.city].filter(Boolean).join(" "));
  return words.every((w) => text.includes(w));
}

export function withOrigin(f: Filters, origin: LatLng | null): Filters {
  return { ...f, origin };
}
