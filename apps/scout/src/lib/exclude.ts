import rules from "../../exclude.json" with { type: "json" };
import type { RawEvent } from "../types";
import { slug } from "./normalize";

// Regole in exclude.json (versionato): valgono per scout online e ingest della skill
const patterns = rules.patterns.map((p) => new RegExp(p, "i"));
const venues = rules.venues.map(slug);

/** Motivo dell'esclusione, o null se l'evento va tenuto. */
export function exclusionReason(e: Pick<RawEvent, "title" | "description" | "venueName">): string | null {
  const venue = slug(e.venueName ?? "");
  const hitVenue = venue && venues.find((v) => venue.includes(v));
  if (hitVenue) return `luogo: ${hitVenue}`;
  const text = `${e.title}\n${e.description ?? ""}`;
  const hit = patterns.find((re) => re.test(text));
  return hit ? `testo: ${hit.source}` : null;
}
