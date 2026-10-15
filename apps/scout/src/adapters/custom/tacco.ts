import { romeTime, timeOnDay } from "../../lib/itdate";
import type { Adapter, RawEvent, Source } from "../../types";
import { extractJsonLd } from "../jsonld";

// Il Tacco di Bacco: liste per città e tema (/torino/spettacoli/, /torino/mostre/) con JSON-LD
// completo ma solo date (2026-10-05). L'ora sta nella descrizione («alle ore 20.00»).
// Titoli col comune davanti: «Torino | Coez».

const ymd = (s: string) => s.split("-").map(Number) as [number, number, number];

export function taccoEvents(source: Pick<Source, "cities">, events: RawEvent[]): RawEvent[] {
  const cities = source.cities?.map((c) => c.toLowerCase());
  return events
    .filter((e) => !cities || cities.includes((e.city ?? "").toLowerCase()))
    .map((e) => {
      const title = e.title.replace(/^[^|]{2,40}\|\s*/, "").trim() || e.title;
      if (!e.allDay) return { ...e, title };
      // new Date("2026-10-05") è mezzanotte UTC: il giorno è quello scritto, non quello a Roma
      const day = e.startsAt.toISOString().slice(0, 10);
      const timed = timeOnDay(e.description ?? "", day);
      const endDay = e.endsAt?.toISOString().slice(0, 10);
      return {
        ...e,
        title,
        startsAt: timed ?? romeTime(...ymd(day), 12),
        allDay: !timed,
        endsAt: endDay && endDay !== day ? romeTime(...ymd(endDay), 23, 59) : null,
      };
    });
}

export const taccoAdapter: Adapter = {
  extract: async (source, content) => taccoEvents(source, extractJsonLd(content.body, content.url)),
};
