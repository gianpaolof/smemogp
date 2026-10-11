import { CATEGORIES, type Category, type NewEvent } from "@smemogp/db";
import type { RawEvent, Source } from "../types";
import { sha1 } from "./html";

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const romeDay = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });

const TITLE_NOISE = /^(concerto|mostra|spettacolo|evento|live|dj set|festival)\s+(di\s+|del\s+|della\s+)?|\s+(a\s+)?torino$/g;

/** Titolo confrontabile tra fonti: senza accenti, punteggiatura, prefissi generici e «Torino» finale. */
export const normTitle = (title: string) => slug(title).replace(TITLE_NOISE, "").trim();

/** Id di base: titolo normalizzato + giorno (Roma). Il luogo lo disambigua `resolveId` in lib/dedup. */
export function eventId(e: Pick<RawEvent, "title" | "startsAt">, disambiguator = "") {
  return sha1([normTitle(e.title), romeDay(e.startsAt), disambiguator].join("|"));
}

const KEYWORDS: [Category, RegExp][] = [
  // Niente "opera": in italiano è anche l'opera d'arte (mostre)
  ["musica", /concert|music|live|jazz|rock|dj|festival musica|orchestra/i],
  ["teatro", /teatr|spettacol|danza|prosa|comic|cabaret/i],
  ["mostre", /mostr|esposizion|museo|arte|galleri/i],
  ["cinema", /cinema|film|proiezion|rassegna/i],
  ["sagre", /sagra|fiera|festa patronale|pro loco/i],
  ["food", /degustaz|vino|cibo|food|enogastr|mercato/i],
  ["outdoor", /trekking|escursion|ciclo|corsa|trail|montagna|camminata/i],
  ["famiglie", /bambin|famigli|kids|ragazzi/i],
];

export function guessCategory(text: string): Category {
  return KEYWORDS.find(([, re]) => re.test(text))?.[0] ?? "altro";
}

export function toNewEvent(raw: RawEvent, source: Source): NewEvent {
  const category =
    raw.category && (CATEGORIES as readonly string[]).includes(raw.category)
      ? raw.category
      : guessCategory(`${raw.title} ${raw.description ?? ""} ${source.category ?? ""}`);
  return {
    id: eventId(raw),
    title: raw.title.trim(),
    description: raw.description?.slice(0, 2000) ?? null,
    startsAt: raw.startsAt,
    endsAt: raw.endsAt ?? null,
    allDay: raw.allDay ?? false,
    venueName: raw.venueName ?? null,
    address: raw.address ?? null,
    city: raw.city ?? null,
    lat: raw.lat ?? null,
    lng: raw.lng ?? null,
    category,
    priceText: raw.priceText ?? null,
    imageUrl: raw.imageUrl ?? null,
    url: raw.url,
    sourceId: source.id,
    updatedAt: new Date(),
  };
}
