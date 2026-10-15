import * as cheerio from "cheerio";
import { fetchText } from "../../lib/http";
import { MONTHS, romeTime } from "../../lib/itdate";
import type { Adapter, RawEvent } from "../../types";

// Magazzino sul Po: gli eventi sono prodotti WooCommerce mostrati in un carosello paginato
// (?paged320=N). La data è solo testo, senza anno: «16 Ottobre ore 21:00...».
const LIST = "https://www.magazzinosulpo.com/eventi/";
const MAX_PAGES = 5;
const WHEN = new RegExp(`(\\d{1,2})\\s+(${MONTHS.join("|")})(?:\\s+ore\\s+(\\d{1,2})(?:[:.](\\d{2}))?)?`, "i");

/** Senza anno: un mese già passato da più di un mese è dell'anno prossimo. */
export function inferYear(month: number, now = new Date()): number {
  const [y, m] = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }).split("-").map(Number);
  return month < m - 1 ? y + 1 : y;
}

export function parseMagazzinoPage(html: string, now = new Date()): RawEvent[] {
  const $ = cheerio.load(html);
  const out: RawEvent[] = [];
  $(".wpcp-single-item").each((_, el) => {
    const card = $(el);
    const link = card.find(".wpcp-product-title a").first();
    const title = link.text().trim();
    const url = link.attr("href");
    const m = card.find(".wpcp-product-content").text().match(WHEN);
    if (!title || !url || !m) return;
    const [, d, mon, h, min] = m;
    const month = MONTHS.indexOf(mon.toLowerCase()) + 1;
    const year = inferYear(month, now);
    const price = card.find(".wpcp-product-price").text().replace(/\s+/g, " ").trim();
    out.push({
      title,
      startsAt: romeTime(year, month, +d, h != null ? +h : 12, min != null ? +min : 0),
      allDay: h == null,
      priceText: /libera|gratu/i.test(price) ? "Gratis" : price || null,
      imageUrl: card.find("img").attr("src") ?? null,
      url,
    });
  });
  return out;
}

export const magazzinoAdapter: Adapter = {
  fetch: async () => {
    const pages: string[] = [];
    for (let p = 1; p <= MAX_PAGES; p++) {
      if (p > 1) await new Promise((r) => setTimeout(r, 1000));
      const html = await fetchText(p === 1 ? LIST : `${LIST}?paged320=${p}`);
      if (!cheerio.load(html)(".wpcp-single-item").length) break;
      pages.push(html);
    }
    return { url: LIST, body: JSON.stringify(pages) };
  },
  extract: async (_source, content) => (JSON.parse(content.body) as string[]).flatMap((h) => parseMagazzinoPage(h)),
};
