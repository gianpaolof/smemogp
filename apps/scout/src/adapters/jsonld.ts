import * as cheerio from "cheerio";
import type { Adapter, RawEvent } from "../types";

type Json = Record<string, unknown>;

const isEventType = (t: unknown) =>
  (Array.isArray(t) ? t : [t]).some((x) => typeof x === "string" && /Event$/.test(x));

function collect(node: unknown, out: Json[]) {
  if (Array.isArray(node)) return node.forEach((n) => collect(n, out));
  if (!node || typeof node !== "object") return;
  const obj = node as Json;
  if (isEventType(obj["@type"])) out.push(obj);
  if (obj["@graph"]) collect(obj["@graph"], out);
  if (obj.itemListElement) collect(obj.itemListElement, out);
  if (obj.item) collect(obj.item, out);
}

// Alcuni CMS (WordPress) mettono entità HTML dentro il JSON-LD: "&#8211;", "&amp;"
const decode = (s: string) => (/&#?\w+;/.test(s) ? cheerio.load(`<p>${s}</p>`)("p").text() : s);

const str = (v: unknown): string | null =>
  typeof v === "string" ? decode(v) :Array.isArray(v) ? str(v[0]) : v && typeof v === "object" ? str((v as Json).url ?? (v as Json).name) : null;

function toRaw(e: Json, pageUrl: string): RawEvent | null {
  const title = str(e.name);
  const start = str(e.startDate);
  if (!title || !start) return null;
  const startsAt = new Date(start);
  if (Number.isNaN(startsAt.getTime())) return null;

  const loc = (Array.isArray(e.location) ? e.location[0] : e.location) as Json | undefined;
  const addr = loc?.address as Json | string | undefined;
  const geo = loc?.geo as Json | undefined;
  const offers = (Array.isArray(e.offers) ? e.offers[0] : e.offers) as Json | undefined;
  const end = str(e.endDate);

  return {
    title,
    startsAt,
    endsAt: end ? new Date(end) : null,
    allDay: /^\d{4}-\d{2}-\d{2}$/.test(start),
    description: str(e.description),
    venueName: str(loc?.name),
    address:
      typeof addr === "string"
        ? addr
        : addr
          ? [addr.streetAddress, addr.postalCode, addr.addressLocality].filter(Boolean).join(", ")
          : null,
    city: typeof addr === "object" ? str(addr.addressLocality) : null,
    lat: geo?.latitude != null ? Number(geo.latitude) : null,
    lng: geo?.longitude != null ? Number(geo.longitude) : null,
    priceText: offers?.price != null ? `${offers.price} ${offers.priceCurrency ?? ""}`.trim() : null,
    imageUrl: str(e.image),
    url: str(e.url) ? new URL(str(e.url)!, pageUrl).href : pageUrl,
  };
}

/** Estrae schema.org/Event da <script type="application/ld+json">. Gratis e affidabile. */
export function extractJsonLd(html: string, pageUrl: string): RawEvent[] {
  const $ = cheerio.load(html);
  const nodes: Json[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      collect(JSON.parse($(el).text()), nodes);
    } catch {
      // JSON-LD malformato: ignora il blocco
    }
  });
  return nodes.map((n) => toRaw(n, pageUrl)).filter((e): e is RawEvent => e !== null);
}

export const jsonldAdapter: Adapter = {
  extract: async (_source, content) => extractJsonLd(content.body, content.url),
};
