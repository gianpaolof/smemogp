import { readFile } from "node:fs/promises";
import { z } from "zod";
import { CATEGORIES } from "@smemogp/db";
import type { RawEvent } from "../types";
import { romeDay } from "./normalize";

/** Tema di ricerca web (`apps/scout/searches.json`): la query è per il motore, non per l'utente. */
export const SearchTopic = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  query: z.string().min(3),
  category: z.enum(CATEGORIES).optional(),
  /** Pagine candidate da scaricare per tema, default 8 */
  maxPages: z.number().int().min(1).max(30).optional(),
  enabled: z.boolean().optional(),
});
export type SearchTopic = z.infer<typeof SearchTopic>;

export async function loadTopics(only?: string): Promise<SearchTopic[]> {
  const raw = JSON.parse(await readFile(new URL("../../searches.json", import.meta.url), "utf8"));
  const topics = z.array(SearchTopic).parse(raw);
  if (only) {
    const hit = topics.filter((t) => t.id === only);
    if (!hit.length) throw new Error(`Tema "${only}" non in searches.json (id: ${topics.map((t) => t.id).join(", ")})`);
    return hit;
  }
  return topics.filter((t) => t.enabled !== false);
}

/** Cosa restituisce il modello: solo pagine da verificare, mai i dati dell'evento. */
export const Candidates = z.object({
  pages: z.array(z.object({ url: z.string(), title: z.string() })),
});

export function discoveryMessages(topic: SearchTopic, window: { from: Date; to: Date }, max: number) {
  const system = `Cerchi eventi a Torino e dintorni (entro ~40 km) per un'app personale di eventi.
Usa la ricerca web, poi restituisci SOLO JSON: {"pages":[{"url":"…","title":"…"}]}.
Regole:
- Solo pagine di singoli eventi con data nel periodo indicato: pagina ufficiale dell'evento, del luogo o della biglietteria. Evita articoli generici, liste "cosa fare nel weekend", social.
- Usa solo URL che hai visto nei risultati di ricerca: non inventarli e non ricostruirli.
- Escludi lirica, opera lirica, melodramma e tutto il Teatro Regio. "Opera" nel senso di opera d'arte va bene.
- Al massimo ${max} pagine, le più rilevanti e diverse tra loro. Se non trovi nulla: {"pages":[]}.`;
  const user = `Tema: ${topic.query}
Periodo: dal ${romeDay(window.from)} al ${romeDay(window.to)} (oggi ${romeDay(window.from)}).`;
  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}

const TRACKING = /^(utm_|fbclid$|gclid$|mc_|ref$|aff$)/;

/** URL http(s) senza frammento, parametri di tracciamento e slash finale; null se non valido. */
export function normalizeUrl(input: string): string | null {
  try {
    const u = new URL(input.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    u.hash = "";
    for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
    return u.href.replace(/\/$/, "");
  } catch {
    return null;
  }
}

const hostOf = (u: string) => new URL(u).host.replace(/^www\./, "");

/**
 * Tiene solo i candidati il cui sito compare tra i risultati di ricerca citati: un URL
 * inventato dal modello di solito sta su un host mai visto. Senza citazioni (alcuni motori
 * nativi non le danno) si tiene tutto: la verifica vera è lo scaricamento della pagina.
 */
export function groundCandidates(urls: string[], citations: string[]): { kept: string[]; dropped: number } {
  const unique = [...new Set(urls.map(normalizeUrl).filter((u): u is string => u !== null))];
  if (!citations.length) return { kept: unique, dropped: urls.length - unique.length };
  const cited = new Set(citations.map(normalizeUrl).filter((u): u is string => u !== null).map(hostOf));
  const kept = unique.filter((u) => cited.has(hostOf(u)));
  return { kept, dropped: urls.length - kept.length };
}

/** Evento che tocca il periodo: non finito prima di `from`, iniziato entro `to`. */
export function inWindow(e: Pick<RawEvent, "startsAt" | "endsAt">, window: { from: Date; to: Date }) {
  return (e.endsAt ?? e.startsAt) >= window.from && e.startsAt <= window.to;
}
