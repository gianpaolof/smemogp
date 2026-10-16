import * as cheerio from "cheerio";
import type { Category } from "@smemogp/db";
import { fetchText } from "../../lib/http";
import { romeTime } from "../../lib/itdate";
import type { Adapter, RawEvent } from "../../types";
import { extractJsonLd } from "../jsonld";

// Comune di Torino (eventi.comune.torino.it, WordPress + Events Manager). L'API del plugin vuole
// il login e il feed ICS dà sempre gli stessi 50 eventi più vecchi. Strada pubblica:
// 1. REST wp/v2/event: i più recenti per data di pubblicazione (solo link, niente date);
// 2. pagina dell'evento: JSON-LD Event, ma rotto. Le date sono oggetti PHP
//    {"date":"2026-10-22 18:00:00.000000","timezone":"UTC"} che in realtà sono ora di Torino,
//    e ci sono virgole finali. Lo ripariamo prima di passarlo all'estrattore.
const API = "https://eventi.comune.torino.it/wp-json/wp/v2/event";
const MAX_EVENTS = 150; // pubblicati negli ultimi due mesi circa
const PARALLEL = 3;
const PAUSE_MS = 500;

type Listed = { link: string };

const CATEGORY: [RegExp, Category][] = [
  [/^(mostra|exhibition|museum|photography)$/i, "mostre"],
  [/^(teatro|theater|danza)$/i, "teatro"],
  [/^(musica|music)$/i, "musica"],
  [/^cinema$/i, "cinema"],
  [/^sport$/i, "outdoor"],
];

/** «2026-10-22 18:00:00» ora di Torino → ISO con offset; mezzanotte e 23:59:59 = solo giorno. */
function phpDate(wall: string): string {
  const [d, t] = wall.split(" ");
  if (!t || t.startsWith("00:00:00") || t.startsWith("23:59:59")) return d;
  const [y, m, day] = d.split("-").map(Number);
  const [h, min] = t.split(":").map(Number);
  return romeTime(y, m, day, h, min).toISOString();
}

/** JSON-LD della pagina reso valido: date come stringhe, niente virgole finali. */
export function repairJsonLd(html: string): string {
  return html.replace(/(<script[^>]*ld\+json[^>]*>)([\s\S]*?)(<\/script>)/g, (_, open, body: string, close) => {
    const fixed = body
      .replace(/\{\s*"date"\s*:\s*"([^"]+)"[^}]*\}/g, (_m, wall: string) => JSON.stringify(phpDate(wall)))
      .replace(/,(\s*[}\]])/g, "$1");
    return open + fixed + close;
  });
}

export function parseComuneDetail(html: string, url: string): RawEvent | null {
  const [e] = extractJsonLd(repairJsonLd(html), url);
  if (!e) return null;
  const label = html.match(/"category"\s*:\s*"([^"]+)"/)?.[1] ?? "";
  const category = CATEGORY.find(([re]) => re.test(label.trim()))?.[1];
  // «A chi è rivolto»: Tutti, Adulti, Famiglie, Bambini, Ragazzi e giovani, Professionisti (sonda 2026-10-16)
  const $ = cheerio.load(html);
  const audience = $("#destinatari p").map((_, el) => $(el).text().trim()).get().filter(Boolean).join(", ") || null;
  if (!e.allDay) return { ...e, category, audience };
  // Solo giorno: new Date("2026-11-06") è mezzanotte UTC, il giorno scritto è quello giusto
  const ymd = (d: Date) => d.toISOString().slice(0, 10).split("-").map(Number) as [number, number, number];
  const end = e.endsAt && e.endsAt.toISOString().slice(0, 10) !== e.startsAt.toISOString().slice(0, 10) ? e.endsAt : null;
  return {
    ...e,
    category,
    audience,
    startsAt: romeTime(...ymd(e.startsAt), 12),
    endsAt: end ? romeTime(...ymd(end), 23, 59) : null,
  };
}

export const comuneAdapter: Adapter = {
  fetch: async () => {
    const links: string[] = [];
    for (let page = 1; links.length < MAX_EVENTS; page++) {
      const url = `${API}?per_page=100&page=${page}&_fields=link`;
      const batch = JSON.parse(await fetchText(url)) as Listed[];
      links.push(...batch.map((b) => b.link));
      if (batch.length < 100) break;
    }
    // Il corpo è la lista dei link: se non cambia, lo scout salta la fonte senza leggere i dettagli
    return { url: API, body: JSON.stringify(links.slice(0, MAX_EVENTS)) };
  },
  extract: async (_source, content) => {
    const links = JSON.parse(content.body) as string[];
    const out: RawEvent[] = [];
    let failed = 0;
    // Il sito risponde in ~4 s a pagina: 3 alla volta, con una pausa tra un gruppo e l'altro
    for (let i = 0; i < links.length; i += PARALLEL) {
      if (i) await new Promise((r) => setTimeout(r, PAUSE_MS));
      const pages = await Promise.allSettled(links.slice(i, i + PARALLEL).map((l) => fetchText(l)));
      pages.forEach((p, j) => {
        const e = p.status === "fulfilled" ? parseComuneDetail(p.value, links[i + j]) : null;
        if (e) out.push(e);
        else if (p.status === "rejected") failed++;
      });
    }
    if (failed) console.warn(`[comune] ${failed} dettagli non letti`);
    return out;
  },
};
