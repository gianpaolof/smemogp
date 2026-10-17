import rules from "../../exclude.json" with { type: "json" };
import type { RawEvent } from "../types";
import { slug } from "./normalize";

// Regole in exclude.json (versionato): valgono per scout online e ingest della skill
const patterns = rules.patterns.map((p) => new RegExp(p, "i"));
const venues = rules.venues.map(slug);
const audiences = new Set(rules.audiences.map(slug));
const people = rules.people.map((p) => new RegExp(`\\b${p.replace(/\s+/g, "\\s+")}\\b`, "i"));
const talks = rules.talks.patterns.map((p) => new RegExp(p, "i"));
const talksUnless = rules.talks.unless.map((p) => new RegExp(p, "i"));

/** Motivo dell'esclusione, o null se l'evento va tenuto. */
export function exclusionReason(e: Pick<RawEvent, "title" | "description" | "venueName" | "audience">): string | null {
  const venue = slug(e.venueName ?? "");
  // Dev'essere il luogo stesso, non un riferimento («Davanti Ingresso Teatro Regio» = ritrovo di un tour)
  const hitVenue = venue && venues.find((v) => venue.startsWith(v));
  if (hitVenue) return `luogo: ${hitVenue}`;
  // Pubblico dichiarato: basta che uno dei valori sia escluso (es. «Famiglie»)
  const hitAudience = (e.audience ?? "").split(",").map(slug).find((a) => audiences.has(a));
  if (hitAudience) return `pubblico: ${hitAudience}`;
  const text = `${e.title}\n${e.description ?? ""}`;
  const person = people.find((re) => re.test(text));
  if (person) return `persona: ${person.source}`;
  const hit = patterns.find((re) => re.test(text));
  if (hit) return `testo: ${hit.source}`;
  // Conferenze solo dal titolo, e non quelle a sfondo etico (Emergency, don Ciotti…)
  const talk = talks.find((re) => re.test(e.title));
  return talk && !talksUnless.some((re) => re.test(text)) ? `conferenza: ${talk.source}` : null;
}
