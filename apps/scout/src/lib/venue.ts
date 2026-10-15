import type { RawEvent, Source } from "../types";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Locale con una sola sede: se l'evento non dice dove si tiene, è lì. Toglie anche il nome del
 * locale in coda al titolo («Tavoli Linguistici — Imbarchino»), aggiunto dai CMS per la SEO.
 */
export function withDefaultVenue(e: RawEvent, venue: NonNullable<Source["defaultVenue"]>): RawEvent {
  const title = e.title.replace(new RegExp(`\\s+[—–|-]\\s+${escape(venue.venueName)}\\s*$`, "i"), "").trim() || e.title;
  if (e.venueName || e.address || e.lat != null) return { ...e, title };
  return { ...e, title, ...venue };
}
