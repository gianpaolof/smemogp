// Date in italiano scritte nel testo delle pagine ("dal 10 al 25 ottobre 2026", "17 ottobre 2026").
// Solo giorni (niente ore): servono a completare intervalli che il JSON-LD non dà.

export const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const MONTH = `(${MONTHS.join("|")})`;

export type DayRange = { from: string; to: string }; // YYYY-MM-DD

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const month = (name: string) => MONTHS.indexOf(name.toLowerCase()) + 1;

const RANGE = new RegExp(`\\bdal(?:l')?\\s*(\\d{1,2})(?:\\s+${MONTH})?(?:\\s+(\\d{4}))?\\s+al(?:l')?\\s*(\\d{1,2})\\s+${MONTH}\\s+(\\d{4})`, "gi");
const SINGLE = new RegExp(`\\b(\\d{1,2})\\s+${MONTH}\\s+(\\d{4})`, "gi");

/** Tutti gli intervalli trovati nel testo, nell'ordine. Una data singola vale come intervallo di un giorno. */
export function findDayRanges(text: string): DayRange[] {
  const out: DayRange[] = [];
  const seen: [number, number][] = [];
  for (const m of text.matchAll(RANGE)) {
    const [, d1, m1, y1, d2, m2, y2] = m;
    const toY = Number(y2);
    const toM = month(m2);
    const fromM = m1 ? month(m1) : toM;
    const fromY = y1 ? Number(y1) : fromM > toM ? toY - 1 : toY;
    out.push({ from: iso(fromY, fromM, Number(d1)), to: iso(toY, toM, Number(d2)) });
    seen.push([m.index!, m.index! + m[0].length]);
  }
  for (const m of text.matchAll(SINGLE)) {
    if (seen.some(([a, b]) => m.index! >= a && m.index! < b)) continue;
    const day = iso(Number(m[3]), month(m[2]), Number(m[1]));
    out.push({ from: day, to: day });
  }
  return out;
}

/** Ora locale di Torino → istante, con l'offset giusto per quel giorno (CET/CEST). */
export function romeTime(y: number, m: number, d: number, h = 0, min = 0): Date {
  const wall = Date.UTC(y, m - 1, d, h, min);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Rome",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date(wall))
      .map((x) => [x.type, x.value]),
  );
  const offset = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - wall;
  return new Date(wall - offset);
}

const DATE_TIME = new RegExp(`\\b(\\d{1,2})\\s+${MONTH}\\s+(\\d{4})(?:[^\\d]{1,12}?(\\d{1,2})[:.](\\d{2}))?`, "i");

/** «giovedì 1 ottobre 2026 | ore 18:30» → { startsAt, allDay }. Senza ora: tutto il giorno. */
export function parseDateTime(text: string): { startsAt: Date; allDay: boolean } | null {
  const m = text.match(DATE_TIME);
  if (!m) return null;
  const [, d, mon, y, h, min] = m;
  if (h == null) return { startsAt: romeTime(+y, month(mon), +d, 12), allDay: true };
  return { startsAt: romeTime(+y, month(mon), +d, +h, +min), allDay: false };
}

/**
 * Orario del giorno `day` (YYYY-MM-DD) scritto nel testo: «lunedì 5 ottobre 2026 alle ore 20.00».
 * Per le liste che nel JSON-LD danno solo la data ma raccontano l'ora nella descrizione.
 */
export function timeOnDay(text: string, day: string): Date | null {
  for (const m of text.matchAll(new RegExp(DATE_TIME.source, "gi"))) {
    const [, d, mon, y, h, min] = m;
    if (h != null && iso(+y, month(mon), +d) === day) return romeTime(+y, month(mon), +d, +h, +min);
  }
  return null;
}

/** Intervallo che parte dal giorno `startDay` (YYYY-MM-DD) ed è più lungo di un giorno, se il testo lo contiene. */
export function rangeStartingOn(text: string, startDay: string): DayRange | undefined {
  return findDayRanges(text).find((r) => r.from === startDay && r.to > r.from);
}
