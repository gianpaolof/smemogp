import * as cheerio from "cheerio";
import { fetchText } from "../../lib/http";
import { MONTHS, romeTime } from "../../lib/itdate";
import type { Adapter, RawEvent } from "../../types";

// MAO – Museo d'Arte Orientale: lista «in programma» con schede `.grid-item` (titolo, giorni,
// tipo Mostra/Evento), niente JSON-LD né API. Per gli eventi l'ora e il luogo stanno nel
// dettaglio, in due <strong>: «Sabato 31 ottobre 2026 dalle ore 18:00» e «@ MAO – via …».
const LIST = "https://www.maotorino.it/it/mostre-eventi/in-programma/";
const MAX_DETAILS = 25;
const MAO = { venueName: "MAO – Museo d'Arte Orientale", address: "Via San Domenico 11, Torino", city: "Torino" };

const DAY = new RegExp(`(\\d{1,2})\\s+(${MONTHS.join("|")})\\s+(\\d{4})`, "i");

function day(text: string): [number, number, number] | null {
  const m = text.match(DAY);
  return m ? [+m[3], MONTHS.indexOf(m[2].toLowerCase()) + 1, +m[1]] : null;
}

export function parseMaoList(html: string): RawEvent[] {
  const $ = cheerio.load(html);
  const out: RawEvent[] = [];
  $(".grid-item").each((_, el) => {
    const card = $(el);
    const link = card.find(".text-content h3 a").first();
    const title = link.text().trim();
    const url = link.attr("href");
    // «31 Ottobre 2026 - 31 Gennaio 2027» oppure «10 Giugno 2027»
    const [from, to] = card.find(".the-labels-date").text().split(/\s+-\s+/).map(day);
    if (!title || !url || !from) return;
    const kind = card.find(".the-labels-cat").text().trim();
    out.push({
      title,
      startsAt: romeTime(...from, 12),
      endsAt: to ? romeTime(...to, 23, 59) : null,
      allDay: true,
      description: card.find(".text-content p").first().text().trim() || null,
      category: /mostra/i.test(kind) ? "mostre" : undefined,
      imageUrl: card.find("img").attr("data-src") ?? null,
      url,
      ...MAO,
    });
  });
  return out;
}

/** Dal dettaglio: ora del primo giorno e luogo se diverso dal museo. */
export function maoDetail(html: string, e: RawEvent): RawEvent {
  const $ = cheerio.load(html);
  const strong = $("main strong").map((_, s) => $(s).text().replace(/\s+/g, " ").trim()).get();
  const time = strong.map((s) => s.match(/\bore\s+(\d{1,2})[:.](\d{2})/i)).find(Boolean);
  const place = strong.find((s) => s.startsWith("@"))?.replace(/^@\s*/, "");
  const out = { ...e };
  if (time) {
    const [y, m, d] = e.startsAt.toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }).split("-").map(Number);
    out.startsAt = romeTime(y, m, d, +time[1], +time[2]);
    out.allDay = false;
  }
  if (place && !/\bmao\b/i.test(place)) {
    out.venueName = place;
    out.address = /torino/i.test(place) ? place : `${place}, Torino`;
  }
  return out;
}

export const maoAdapter: Adapter = {
  extract: async (_source, content) => {
    const list = parseMaoList(content.body);
    const out: RawEvent[] = [];
    let details = 0;
    for (const e of list) {
      // Le mostre durano mesi: l'ora non serve. Gli eventi di un giorno sì.
      if (e.endsAt || e.category === "mostre" || details >= MAX_DETAILS) {
        out.push(e);
        continue;
      }
      if (details++) await new Promise((r) => setTimeout(r, 800));
      out.push(await fetchText(e.url).then((h) => maoDetail(h, e), () => e));
    }
    return out;
  },
};

