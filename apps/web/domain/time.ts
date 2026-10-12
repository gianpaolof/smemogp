import type { Period } from "./types";

/** Tutto il calendario dell'app è in ora di Torino, indipendente dal fuso del server o del browser. */
export const TIME_ZONE = "Europe/Rome";

type YMD = { y: number; m: number; d: number };

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function romeParts(date: Date) {
  const p = Object.fromEntries(partsFmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute };
}

/** Differenza (ms) tra ora di Roma e UTC in quell'istante: +1h o +2h. */
function offsetMs(date: Date) {
  const p = romeParts(date);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
  return asUtc - Math.floor(date.getTime() / 60_000) * 60_000;
}

/** Mezzanotte di Roma del giorno dato, come istante UTC (gestisce il cambio ora). */
function romeMidnight({ y, m, d }: YMD): Date {
  const guess = Date.UTC(y, m - 1, d);
  const first = guess - offsetMs(new Date(guess));
  return new Date(guess - offsetMs(new Date(first)));
}

/** Istante UTC dell'ora `h` (ora di Roma) nel giorno dato. */
export function romeAt(day: YMD, h: number): Date {
  const guess = Date.UTC(day.y, day.m - 1, day.d, h);
  return new Date(guess - offsetMs(new Date(guess - offsetMs(new Date(guess)))));
}

/** Sera: dalle 17 di oggi alle 6 di domani. */
const EVENING_FROM_H = 17;
const EVENING_TO_H = 6;

function addDays({ y, m, d }: YMD, n: number): YMD {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export function romeToday(now: Date): YMD {
  const { y, m, d } = romeParts(now);
  return { y, m, d };
}

/** 0 = domenica … 6 = sabato, nel calendario di Roma. */
function weekday(day: YMD) {
  return new Date(Date.UTC(day.y, day.m - 1, day.d)).getUTCDay();
}

/**
 * Intervallo [from, to) del periodo. `from` è la mezzanotte di oggi (non "adesso"),
 * così la chiave di cache resta stabile per tutta la giornata.
 * Weekend = sabato e domenica correnti se ci siamo già, altrimenti i prossimi.
 */
export function periodBounds(period: Period, now: Date): { from: Date; to: Date } {
  const today = romeToday(now);
  const span = (start: YMD, days: number) => ({
    from: romeMidnight(start),
    to: romeMidnight(addDays(start, days)),
  });

  switch (period) {
    case "stasera":
      return { from: romeAt(today, EVENING_FROM_H), to: romeAt(addDays(today, 1), EVENING_TO_H) };
    case "oggi":
      return span(today, 1);
    case "settimana":
      return span(today, 7);
    case "mese":
      return span(today, 30);
    case "weekend": {
      const wd = weekday(today);
      if (wd === 6) return span(today, 2);
      if (wd === 0) return span(today, 1);
      return span(addDays(today, 6 - wd), 2);
    }
  }
}

/** Ora (0–23) di Roma dell'istante. */
export function romeHour(iso: string): number {
  return romeParts(new Date(iso)).h;
}

/** Chiave "YYYY-MM-DD" del giorno di Roma in cui cade l'istante. */
export function dayKey(iso: string): string {
  const { y, m, d } = romeParts(new Date(iso));
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
