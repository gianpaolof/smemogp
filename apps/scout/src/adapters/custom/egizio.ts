import * as cheerio from "cheerio";
import type { Category } from "@smemogp/db";
import { fetchText } from "../../lib/http";
import type { Adapter, RawEvent } from "../../types";

// Sito Next.js (pages router vecchio stile): ogni listing incorpora tutti gli item completi
// in `__NEXT_DATA__ = {...}` (script inline, non JSON puro). Bastano 2 richieste, niente dettagli.
const BASE = "https://www.museoegizio.it";
const PAGES = {
  appointments: `${BASE}/esplora/appuntamenti/`,
  exhibitions: `${BASE}/esplora/mostre/`,
} as const;

const VENUE = {
  venueName: "Museo Egizio",
  address: "Via Accademia delle Scienze 6, Torino",
  city: "Torino",
  lat: 45.0684,
  lng: 7.6842,
} as const;

type Json = Record<string, unknown>;
type Img = { large?: string; original?: string; medium?: string } | null | undefined;

export type EgizioItem = {
  slug: string;
  title: string;
  description?: string | null;
  tag?: string | null;
  image?: Img;
  headerImage?: Img;
  /** Appuntamenti: secondi (stringa). Mostre: millisecondi (numero). */
  startDate?: string | number | null;
  endDate?: string | number | null;
  dates?: { date: string }[] | null;
  datesRange?: string | null;
};

export type EgizioData = { appointments: EgizioItem[]; exhibitions: EgizioItem[] };

/** Estrae l'oggetto assegnato a `__NEXT_DATA__ = ` (bilanciamento graffe, rispetta le stringhe). */
export function parseNextData(html: string): Json | null {
  const at = html.indexOf("__NEXT_DATA__");
  const start = at < 0 ? -1 : html.indexOf("{", at);
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try {
        return JSON.parse(html.slice(start, i + 1)) as Json;
      } catch {
        return null;
      }
    }
  }
  return null;
}

const props = (html: string) => (parseNextData(html)?.props ?? {}) as Json;

/** Listing appuntamenti: `appointmentList` + l'eventuale `highlighted` (dedup per slug). */
export function parseAppointmentsPage(html: string): EgizioItem[] {
  const p = props(html);
  const list = [...((p.appointmentList as EgizioItem[]) ?? []), p.highlighted as EgizioItem | undefined];
  const seen = new Set<string>();
  return list.filter((a): a is EgizioItem => !!a?.slug && !!a.title && !seen.has(a.slug) && !!seen.add(a.slug));
}

export const parseExhibitionsPage = (html: string): EgizioItem[] =>
  ((props(html).exhibitionList as EgizioItem[]) ?? []).filter((e) => e?.slug && e.title);

// Il CMS salva l'ora locale "come se fosse UTC": i campi UTC del timestamp sono l'ora di Torino.
const wall = (v: string | number | null | undefined, unit: "s" | "ms"): Date | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(unit === "s" ? n * 1000 : n);
};

const dayOnly = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** Ora "a muro" Europe/Rome (nei campi UTC di `w`) -> istante reale. */
export function romeWallToDate(w: Date): Date {
  const guess = w.getTime();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Rome",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date(guess))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return new Date(guess - (asUtc - guess));
}

export function htmlToText(html: string | null | undefined, max = 1500): string | null {
  if (!html) return null;
  const text = cheerio
    .load(`<div>${html.replace(/<br\s*\/?>/gi, "\n")}</div>`)
    .text()
    .replace(/\r/g, "")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n[\s]*/g, "\n")
    .trim();
  return text ? (text.length > max ? `${text.slice(0, max - 1)}…` : text) : null;
}

export function guessCategory(a: EgizioItem): Category {
  const t = `${a.tag ?? ""} ${a.title} ${htmlToText(a.description, 3000) ?? ""}`;
  if (/mostr[ae] temporane/i.test(a.tag ?? "")) return "mostre";
  if (/concert|conservatorio|matin[ée]e|musica|quartet|orchestra|\bsax/i.test(t)) return "musica";
  if (/proiezion|film|cinema|documentario/i.test(t)) return "cinema";
  if (/teatr|spettacolo/i.test(t)) return "teatro";
  if (/bambin|famigli/i.test(t)) return "famiglie";
  return "altro";
}

const img = (i: Img) => i?.large || i?.original || i?.medium || null;

/** Una RawEvent per data (o una sola con range se `datesRange` = "1"). */
export function appointmentToEvents(a: EgizioItem): RawEvent[] {
  const dates = (a.dates?.map((d) => wall(d.date, "s")) ?? []).filter((d): d is Date => !!d);
  if (!dates.length) {
    const s = wall(a.startDate, "s");
    if (s) dates.push(s);
  }
  if (!dates.length) return [];
  dates.sort((x, y) => x.getTime() - y.getTime());
  const end = wall(a.endDate, "s");
  const ranged = a.datesRange === "1" && dates.length > 1;
  const starts = ranged ? [dates[0]] : dates;
  const base = {
    title: a.title.trim(),
    description: htmlToText(a.description),
    ...VENUE,
    category: guessCategory(a),
    imageUrl: img(a.image),
    url: `${PAGES.appointments}${a.slug}/`,
  };
  return starts.map((s) => {
    const allDay = ranged || (s.getUTCHours() === 0 && s.getUTCMinutes() === 0);
    const last = ranged ? dates[dates.length - 1] : end;
    return {
      ...base,
      allDay,
      startsAt: allDay ? dayOnly(s) : romeWallToDate(s),
      endsAt: last ? (allDay ? dayOnly(last) : romeWallToDate(last)) : null,
    };
  });
}

export function exhibitionToEvent(e: EgizioItem): RawEvent | null {
  const s = wall(e.startDate, "ms");
  if (!s) return null;
  const end = wall(e.endDate, "ms");
  return {
    title: e.title.trim(),
    startsAt: dayOnly(s),
    endsAt: end ? dayOnly(end) : null,
    allDay: true,
    description: htmlToText(e.description),
    ...VENUE,
    category: "mostre",
    imageUrl: img(e.image) ?? img(e.headerImage),
    url: `${PAGES.exhibitions}${e.slug}/`,
  };
}

/** Solo eventi futuri o in corso (fine, o inizio, non prima di oggi). */
export function parseEgizio(data: EgizioData, now = new Date()): RawEvent[] {
  const today = dayOnly(now).getTime();
  return [
    ...data.exhibitions.map(exhibitionToEvent).filter((e): e is RawEvent => !!e),
    ...data.appointments.flatMap(appointmentToEvents),
  ].filter((e) => (e.endsAt ?? e.startsAt).getTime() >= today);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const egizioAdapter: Adapter = {
  fetch: async () => {
    const appointments = parseAppointmentsPage(await fetchText(PAGES.appointments));
    await sleep(1000);
    const exhibitions = parseExhibitionsPage(await fetchText(PAGES.exhibitions));
    const data: EgizioData = { appointments, exhibitions };
    return { url: PAGES.appointments, body: JSON.stringify(data) };
  },
  extract: async (_source, content) => parseEgizio(JSON.parse(content.body) as EgizioData),
};
