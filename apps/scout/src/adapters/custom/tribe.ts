import * as cheerio from "cheerio";
import { fetchText } from "../../lib/http";
import { romeTime } from "../../lib/itdate";
import type { Adapter, RawEvent } from "../../types";

// The Events Calendar (plugin WordPress): API REST /wp-json/tribe/events/v1/events.
// Orari locali con fuso dichiarato, prezzo, immagine. `feedUrl` = endpoint della fonte.

const MAX_PAGES = 3;

type TribeVenue = { venue?: string; address?: string; city?: string; geo_lat?: number; geo_lng?: number };

export type TribeEvent = {
  title: string;
  url: string;
  description?: string;
  start_date: string; // "2026-10-15 21:00:00", ora locale
  end_date?: string;
  all_day?: boolean;
  timezone?: string;
  cost?: string;
  image?: { url?: string } | false;
  venue?: TribeVenue | [];
};

type TribePage = { events: TribeEvent[]; next_rest_url?: string };

const text = (html: string) => cheerio.load(`<div>${html}</div>`)("div").text().replace(/\s+/g, " ").trim();

function local(s: string): Date {
  const [d, t = "00:00:00"] = s.split(" ");
  const [y, m, day] = d.split("-").map(Number);
  const [h, min] = t.split(":").map(Number);
  return romeTime(y, m, day, h, min);
}

// 08:00–17:00 è l'orario che il plugin propone a un evento nuovo: chi lo lascia non ha messo l'ora
const placeholder = (e: TribeEvent) => e.start_date.endsWith(" 08:00:00") && !!e.end_date?.endsWith(" 17:00:00");

export function tribeToRaw(e: TribeEvent): RawEvent {
  const v = Array.isArray(e.venue) ? undefined : e.venue;
  const allDay = !!e.all_day || placeholder(e);
  const multiDay = e.end_date && e.end_date.slice(0, 10) !== e.start_date.slice(0, 10);
  return {
    title: text(e.title),
    startsAt: allDay ? local(`${e.start_date.slice(0, 10)} 12:00:00`) : local(e.start_date),
    endsAt: e.end_date && (multiDay || !allDay) ? local(e.end_date) : null,
    allDay,
    description: e.description ? text(e.description).slice(0, 2000) || null : null,
    venueName: v?.venue ? text(v.venue) : null,
    address: v?.address ?? null,
    city: v?.city ?? null,
    lat: v?.geo_lat ?? null,
    lng: v?.geo_lng ?? null,
    priceText: e.cost || null,
    imageUrl: (e.image && e.image.url) || null,
    url: e.url,
  };
}

export const tribeAdapter: Adapter = {
  fetch: async (source) => {
    if (!source.feedUrl) throw new Error(`${source.id}: manca feedUrl (endpoint tribe/events/v1)`);
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
    const first = new URL(source.feedUrl);
    first.searchParams.set("start_date", today);
    const pages: TribePage[] = [];
    let next: string | undefined = first.href;
    while (next && pages.length < MAX_PAGES) {
      if (pages.length) await new Promise((r) => setTimeout(r, 1000));
      const page = JSON.parse(await fetchText(next)) as TribePage;
      pages.push(page);
      next = page.next_rest_url;
    }
    return { url: first.href, body: JSON.stringify(pages.flatMap((p) => p.events)) };
  },
  extract: async (_source, content) => (JSON.parse(content.body) as TribeEvent[]).map(tribeToRaw),
};
