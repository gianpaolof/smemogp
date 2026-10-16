import rules from "../../exclude.json" with { type: "json" };
import type { RawEvent } from "../types";
import { slug } from "./normalize";

// Regole in exclude.json (versionato): valgono per scout online e ingest della skill
const patterns = rules.patterns.map((p) => new RegExp(p, "i"));
const venues = rules.venues.map(slug);
const audiences = new Set(rules.audiences.map(slug));

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
  const hit = patterns.find((re) => re.test(text));
  return hit ? `testo: ${hit.source}` : null;
}
