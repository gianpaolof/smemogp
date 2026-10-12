import type { Category, Period } from "./types";
import { TIME_ZONE } from "./time";

export const PERIOD_LABELS: Record<Period, string> = {
  stasera: "Stasera",
  oggi: "Oggi",
  weekend: "Weekend",
  settimana: "7 giorni",
  mese: "30 giorni",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  musica: "Musica",
  teatro: "Teatro",
  mostre: "Mostre",
  cinema: "Cinema",
  sagre: "Sagre",
  food: "Gastronomia",
  outdoor: "All'aperto",
  famiglie: "Famiglie",
  altro: "Altro",
};

const timeFmt = new Intl.DateTimeFormat("it-IT", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
const dayNumFmt = new Intl.DateTimeFormat("it-IT", { timeZone: TIME_ZONE, day: "numeric" });
const weekdayFmt = new Intl.DateTimeFormat("it-IT", { timeZone: TIME_ZONE, weekday: "short" });
const monthFmt = new Intl.DateTimeFormat("it-IT", { timeZone: TIME_ZONE, month: "short" });
const shortDateFmt = new Intl.DateTimeFormat("it-IT", { timeZone: TIME_ZONE, day: "numeric", month: "short" });
const longDateFmt = new Intl.DateTimeFormat("it-IT", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const strip = (s: string) => s.replace(".", "").toUpperCase();

export function formatTime(iso: string) {
  return timeFmt.format(new Date(iso));
}

/** { num: "17", label: "SAB / OTT" } per la colonna giorno. */
export function formatDayHeading(iso: string) {
  const d = new Date(iso);
  return { num: dayNumFmt.format(d), label: `${strip(weekdayFmt.format(d))} / ${strip(monthFmt.format(d))}` };
}

export function formatLongDate(iso: string) {
  return longDateFmt.format(new Date(iso));
}

export function formatShortDate(iso: string) {
  return shortDateFmt.format(new Date(iso));
}

/**
 * Link verso la fonte dell'evento, solo se http(s). Gli URL arrivano da siti esterni (scraping):
 * un `javascript:` finito in un href sarebbe eseguito al clic.
 */
export function safeExternalUrl(url: string | null | undefined): { href: string; host: string } | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return { href: u.href, host: u.hostname.replace(/^www\./, "") };
  } catch {
    return null;
  }
}

/** Nomi leggibili delle fonti (id di `apps/scout/sources.json`). */
const SOURCE_LABELS: Record<string, string> = {
  "eventbrite-torino": "Eventbrite",
  torinotoday: "TorinoToday",
  "zero-torino": "Zero",
  "museo-egizio": "Museo Egizio",
  "circolo-lettori": "Circolo dei Lettori",
  "accademia-scienze": "Accademia delle Scienze",
  "teatro-stabile": "Teatro Stabile",
  "ogr-torino": "OGR Torino",
  "club-to-club": "Club to Club",
};

export function sourceLabel(sourceId: string, url: string | null) {
  return SOURCE_LABELS[sourceId] ?? safeExternalUrl(url)?.host ?? sourceId;
}

/** "Via Roma 1, Torino" senza ripetizioni ("…Torino, Torino" dalle fonti). */
export function joinAddress(...parts: (string | null | undefined)[]): string | null {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of parts.flatMap((p) => (p ?? "").split(","))) {
    const t = piece.trim();
    const key = t.toLowerCase();
    if (!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.length ? out.join(", ") : null;
}

export function formatKm(km: number) {
  const digits = km < 10 ? 1 : 0;
  return `${km.toLocaleString("it-IT", { maximumFractionDigits: digits, minimumFractionDigits: digits })} km`;
}
