import * as cheerio from "cheerio";
import { fetchText } from "../../lib/http";
import { parseDateTime } from "../../lib/itdate";
import type { Adapter, RawEvent } from "../../types";

// WordPress senza tipo "evento" in REST: gli incontri sono post, con data e luogo nella scheda
// dell'archivio mensile /eventi/AAAA/MM/. Leggiamo mese corrente e successivo.
const BASE = "https://torino.circololettori.it/eventi";

export function monthUrls(now = new Date()): string[] {
  const ym = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }).slice(0, 7).split("-").map(Number);
  const next = ym[1] === 12 ? [ym[0] + 1, 1] : [ym[0], ym[1] + 1];
  return [ym, next].map(([y, m]) => `${BASE}/${y}/${String(m).padStart(2, "0")}/`);
}

/** Schede `article` dell'archivio: titolo, link, «giovedì 1 ottobre 2026 | ore 18:30», luogo. */
export function parseCircoloPage(html: string): RawEvent[] {
  const $ = cheerio.load(html);
  const out: RawEvent[] = [];
  $("article").each((_, el) => {
    const card = $(el);
    const link = card.find("h5 a, h2 a, h3 a").first();
    const title = link.text().trim();
    const url = link.attr("href");
    const [when, where] = card
      .find("span.d-block")
      .map((_, s) => $(s).text().trim())
      .get();
    const date = when ? parseDateTime(when) : null;
    if (!title || !url || !date) return;
    // «il Circolo dei lettori, via Bogino 9, Torino»
    const parts = (where ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    out.push({
      title,
      ...date,
      description: card.find(".excerpt").text().trim() || null,
      venueName: parts[0] ?? null,
      address: parts.length > 1 ? parts.slice(1).join(", ") : null,
      city: parts.length > 1 ? parts.at(-1)! : "Torino",
      imageUrl: card.find("img.wp-post-image").attr("src") ?? null,
      url,
    });
  });
  return out;
}

export const circoloAdapter: Adapter = {
  fetch: async () => {
    const pages: string[] = [];
    for (const [i, url] of monthUrls().entries()) {
      if (i) await new Promise((r) => setTimeout(r, 1000));
      pages.push(await fetchText(url).catch(() => "")); // mese successivo può non esistere ancora
    }
    return { url: BASE, body: JSON.stringify(pages) };
  },
  extract: async (_source, content) => (JSON.parse(content.body) as string[]).flatMap(parseCircoloPage),
};
