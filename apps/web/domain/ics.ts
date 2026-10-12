import type { EventItem } from "./types";
import { dayKey } from "./time";

/** Testo iCalendar: escape di \ ; , e a capo (RFC 5545 §3.3.11). */
const text = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const date = (iso: string) => dayKey(iso).replace(/-/g, "");

/** Righe oltre 75 ottetti spezzate con CRLF + spazio. */
function fold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 75) {
    let n = 75;
    while (Buffer.byteLength(rest.slice(0, n)) > 75) n--;
    out.push(rest.slice(0, n));
    rest = " " + rest.slice(n);
  }
  out.push(rest);
  return out.join("\r\n");
}

/** Giorno successivo a una chiave YYYY-MM-DD, in formato YYYYMMDD. */
function nextDay(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10).replace(/-/g, "");
}

export function toIcs(e: EventItem, url: string | null, now: Date): string {
  const allDay = e.allDay;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Eventi Torino//IT",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.id}@eventi-torino`,
    `DTSTAMP:${utc(now.toISOString())}`,
    ...(allDay
      ? [`DTSTART;VALUE=DATE:${date(e.startsAt)}`, `DTEND;VALUE=DATE:${nextDay(dayKey(e.endsAt ?? e.startsAt))}`]
      : [
          `DTSTART:${utc(e.startsAt)}`,
          // Senza fine nota: 2 ore, come durata ragionevole in calendario
          `DTEND:${utc(e.endsAt ?? new Date(new Date(e.startsAt).getTime() + 2 * 3_600_000).toISOString())}`,
        ]),
    `SUMMARY:${text(e.title)}`,
    ...(e.venueName || e.address ? [`LOCATION:${text([e.venueName, e.address, e.city].filter(Boolean).join(", "))}`] : []),
    `GEO:${e.lat};${e.lng}`,
    ...(e.description ? [`DESCRIPTION:${text(e.description.slice(0, 1000))}`] : []),
    ...(url ? [`URL:${url}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
