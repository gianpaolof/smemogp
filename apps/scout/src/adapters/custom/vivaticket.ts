import { z } from "zod";
import { htmlToText } from "../../lib/html";
import { fetchText } from "../../lib/http";
import { romeTime } from "../../lib/itdate";
import type { Adapter, RawEvent } from "../../types";

const API = "https://apigatewayb2cstore.vivaticket.com/api";
const itemSchema = z.object({ id: z.string().regex(/^\d+$/), slug: z.string().min(1), typology: z.string(), ticketTypeId: z.string() });
const searchSchema = z.object({ items: z.array(itemSchema), totalItems: z.number().int().nonnegative() });
const text = z.string().nullish();
const detailSchema = z.object({
  infoPerformance: z.object({ performances: z.array(z.object({ datetime: z.string(), title: text })) }),
  infoEvent: z.object({
    venueDetail: z.object({ name: text, city: text, provinceCode: z.string(), address: text,
      latitude: z.number().min(-90).max(90).nullish(), longitude: z.number().min(-180).max(180).nullish() }),
    eventDetail: z.object({ ticketTypeId: z.string(), title: z.string().min(1), description: text, subTitle: text, note: text,
      shout: text, sellShout: text, image: text, categoryName: text, subCategoryName: text, startDate: text, endDate: text }),
  }),
});

/** Il dettaglio usa ore locali senza offset; la lista le etichetta erroneamente come UTC. */
function localDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):\d{2}$/.exec(value);
  if (!match) throw new Error(`Vivaticket: data non valida: ${value}`);
  const [, y, m, d, h, min] = match.map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d || h > 23 || min > 59)
    throw new Error(`Vivaticket: data non valida: ${value}`);
  return romeTime(y, m, d, h, min);
}

export function vivaticketEvents(detail: unknown, url: string): RawEvent[] {
  const { infoEvent, infoPerformance } = detailSchema.parse(detail);
  const venue = infoEvent.venueDetail;
  if (venue.provinceCode !== "TO") return [];
  const event = infoEvent.eventDetail;
  if (event.ticketTypeId !== "0") return [];
  if (["Sport", "Opera e balletto", "Musica"].includes(event.categoryName ?? "")) return [];
  const description = htmlToText([event.categoryName, event.subCategoryName, event.subTitle,
    event.description, event.note, event.shout, event.sellShout].filter(Boolean).join("\n"), url);
  const category: RawEvent["category"] = event.categoryName === "Teatro" ? "teatro"
    : event.categoryName === "Arte" ? "mostre" : "altro";
  // shortcut: persist fonde repliche nello stesso giorno; rivedere la dedup condivisa per conservarle separate.
  const seen = new Set<string>();
  const rows: RawEvent[] = infoPerformance.performances.flatMap((performance) => {
    if (!performance.datetime) return []; // Pagine generali e biglietti senza appuntamento datato.
    const startsAt = localDate(performance.datetime);
    const title = performance.title || event.title;
    const key = `${title}|${startsAt.toISOString()}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ title, startsAt, allDay: false, description, category,
      venueName: venue.name, address: venue.address, city: venue.city,
      lat: venue.latitude === 0 && venue.longitude === 0 ? null : venue.latitude,
      lng: venue.latitude === 0 && venue.longitude === 0 ? null : venue.longitude,
      imageUrl: event.image, url }];
  });
  if (!rows.length || !["Mostre", "Musei"].includes(event.subCategoryName ?? "")) return rows;
  const dates = infoPerformance.performances.map(p => p.datetime).filter(Boolean).sort();
  const first = event.startDate || dates[0];
  const last = event.endDate || dates.at(-1)!;
  localDate(first);
  localDate(last);
  const day = (value: string, h: number, min: number) => {
    const [y, m, d] = value.slice(0, 10).split("-").map(Number);
    return romeTime(y, m, d, h, min);
  };
  const startsAt = day(first, 0, 0);
  const endsAt = day(last, 23, 59);
  if (endsAt < startsAt) throw new Error("Vivaticket: intervallo mostra non valido");
  return [{ ...rows[0], title: event.title, startsAt, endsAt, allDay: true, category: "mostre" }];
}

export const vivaticketAdapter: Adapter = {
  fetch: async (source) => {
    const items = new Map<string, z.infer<typeof itemSchema>>();
    let received = 0;
    for (let page = 1; ; page++) {
      if (page > 100) throw new Error("Vivaticket: troppe pagine di risultati");
      const result = searchSchema.parse(JSON.parse(await fetchText(`${API}/Events/Search/${page}/it/it-IT?tab=Events&provinceCode=TO`)));
      for (const item of result.items) items.set(item.id, item);
      received += result.items.length;
      if (received >= result.totalItems) break;
      if (!result.items.length) throw new Error("Vivaticket: paginazione incompleta");
    }
    const details: { url: string; detail: unknown }[] = [];
    let failed = 0;
    for (const item of items.values()) {
      if (item.typology !== "ticket" || item.ticketTypeId !== "0") continue; // Abbonamenti e tournée non sono singole rappresentazioni.
      await new Promise((resolve) => setTimeout(resolve, 250));
      try {
        const detail = detailSchema.parse(JSON.parse(await fetchText(`${API}/Event/${item.id}/it/it-IT`)));
        details.push({ url: `https://www.vivaticket.com/it/ticket/${encodeURIComponent(item.slug)}/${item.id}`, detail });
      } catch (error) {
        failed++;
        console.warn(`[vivaticket] dettaglio ${item.id} non letto: ${error instanceof Error ? error.message : error}`);
      }
    }
    if (failed && !details.length) throw new Error("Vivaticket: nessun dettaglio leggibile");
    return { url: source.url, body: JSON.stringify(details) };
  },
  extract: async (_source, content) => {
    const details = z.array(z.object({ url: z.string().url(), detail: detailSchema })).parse(JSON.parse(content.body));
    return details.flatMap(({ url, detail }) => vivaticketEvents(detail, url));
  },
};
