import * as cheerio from "cheerio";
import { extractJsonLd } from "../adapters/jsonld";
import type { FetchedContent, RawEvent, Source } from "../types";
import { fetchText } from "./http";
import { rangeStartingOn } from "./itdate";
import { romeDay } from "./normalize";

const DEFAULT_MAX = 30;
const PAUSE_MS = 1000; // stesso host: 1 req/s
const BUDGET_MS = 5 * 60_000; // per fonte: un sito lento (timeout 20 s a scheda) non deve sforare il job da 45 min

const withoutQuery = (u: string) => u.split(/[?#]/)[0].replace(/\/$/, "");

/** Link alle pagine dettaglio: href che rispettano `linkPattern`, altrimenti gli url degli eventi della lista. */
export function detailLinks(source: Source, pages: FetchedContent[], listEvents: RawEvent[]): string[] {
  const pattern = source.detail?.linkPattern;
  const links: string[] = [];
  if (pattern) {
    const re = new RegExp(pattern);
    for (const page of pages) {
      cheerio
        .load(page.body)("a[href]")
        .each((_, el) => {
          const href = el.attribs.href;
          try {
            const abs = new URL(href, page.url);
            if (re.test(abs.pathname)) links.push(withoutQuery(abs.href));
          } catch {
            // href non valido
          }
        });
    }
  } else {
    const host = new URL(source.url).host;
    for (const e of listEvents) if (new URL(e.url).host === host) links.push(withoutQuery(e.url));
  }
  return [...new Set(links)].slice(0, source.detail?.max ?? DEFAULT_MAX);
}

/** Evento descritto dalla pagina: quello con lo stesso url, altrimenti il primo. */
export function pickDetailEvent(link: string, found: RawEvent[]): RawEvent | undefined {
  return found.find((e) => withoutQuery(e.url) === link) ?? found[0];
}

/**
 * Legge le pagine dettaglio e ne prende il JSON-LD: sostituisce l'evento della lista con lo
 * stesso url (di solito ha l'orario, la lista solo la data). Errori sul singolo dettaglio:
 * si tiene il dato della lista.
 */
export async function followDetails(
  source: Source,
  pages: FetchedContent[],
  listEvents: RawEvent[],
): Promise<RawEvent[]> {
  const byUrl = new Map(listEvents.map((e) => [withoutQuery(e.url), e]));
  const links = detailLinks(source, pages, listEvents);
  let failed = 0;
  const deadline = Date.now() + BUDGET_MS;
  for (const [i, link] of links.entries()) {
    if (Date.now() > deadline) {
      console.warn(`[detail] ${source.id}: tempo esaurito, letti ${i}/${links.length} dettagli`);
      break;
    }
    if (i) await new Promise((r) => setTimeout(r, PAUSE_MS));
    try {
      const html = await fetchText(link);
      const event = pickDetailEvent(link, extractJsonLd(html, link));
      if (event) byUrl.set(link, withTextRange({ ...byUrl.get(link), ...stripNulls(event), url: link }, html));
    } catch {
      failed++;
    }
  }
  if (failed) console.warn(`[detail] ${source.id}: ${failed}/${links.length} dettagli non letti`);
  return [...byUrl.values()];
}

/** JSON-LD senza endDate (TorinoToday): la fine la prende dal testo «dal 10 al 25 ottobre 2026». */
function withTextRange(e: RawEvent, html: string): RawEvent {
  if (e.endsAt) return e;
  const range = rangeStartingOn(cheerio.load(html)("body").text(), romeDay(e.startsAt));
  return range ? { ...e, endsAt: new Date(`${range.to}T23:59:00+01:00`), allDay: e.allDay ?? true } : e;
}

/** Non cancellare un campo della lista con un null del dettaglio. */
function stripNulls(e: RawEvent): RawEvent {
  return Object.fromEntries(Object.entries(e).filter(([, v]) => v != null)) as RawEvent;
}
