import { fetchText } from "../../lib/http";
import { romeTime } from "../../lib/itdate";
import type { Adapter, RawEvent } from "../../types";

// API JSON usata dal sito stesso (vista nelle richieste di /it/torino/eventi/): coordinate e orari inclusi.
const API = "https://zero.eu/api/v2/events";

type ZeroEvent = {
  name: { plain: string };
  link: string;
  excerpt?: { plain?: string };
  start_date: string; // YYYY-MM-DD
  end_date?: string;
  start_time?: string; // HH:MM o ""
  price?: string;
  venue_name?: string;
  venue_coords?: { lat: number; lng: number } | null;
  featured_image?: { sizes?: { large?: { source_url?: string } } };
};

const ymd = (s: string) => s.split("-").map(Number) as [number, number, number];

export function zeroToRaw(e: ZeroEvent): RawEvent {
  const [h, min] = (e.start_time ?? "").split(":").map(Number);
  const timed = Number.isFinite(h) && Number.isFinite(min);
  const multiDay = e.end_date && e.end_date !== e.start_date;
  return {
    title: e.name.plain,
    startsAt: romeTime(...ymd(e.start_date), timed ? h : 12, timed ? min : 0),
    endsAt: multiDay ? romeTime(...ymd(e.end_date!), 23, 59) : null,
    allDay: !timed,
    description: e.excerpt?.plain || null,
    venueName: e.venue_name ?? null,
    city: "Torino",
    lat: e.venue_coords?.lat ?? null,
    lng: e.venue_coords?.lng ?? null,
    priceText: e.price === "free" ? "Gratis" : e.price || null,
    imageUrl: e.featured_image?.sizes?.large?.source_url ?? null,
    url: e.link,
  };
}

export const zeroAdapter: Adapter = {
  fetch: async () => {
    const end = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const url = `${API}?page=1&per_page=100&metro_area=torino&end_date=${end}&lang=it`;
    return { url, body: await fetchText(url) };
  },
  extract: async (_source, content) => (JSON.parse(content.body) as ZeroEvent[]).map(zeroToRaw),
};
