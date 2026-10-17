import type { EventItem } from "./types";
import { dayKey, romeHour, isWeekendDay } from "./time";

/** Senza orario di fine, un evento si considera concluso 3 ore dopo l'inizio. */
const DEFAULT_DURATION_MS = 3 * 3_600_000;

/** Fine effettiva: `endsAt`, o inizio + 3 ore (anche se la fonte dà fine = inizio). */
export function endOf(e: Pick<EventItem, "startsAt" | "endsAt">): Date {
  const start = new Date(e.startsAt);
  const end = e.endsAt ? new Date(e.endsAt) : null;
  return end && end > start ? end : new Date(start.getTime() + DEFAULT_DURATION_MS);
}

export function isOver(e: Pick<EventItem, "startsAt" | "endsAt">, now: Date) {
  return endOf(e) <= now;
}

/** In corso su più giorni (mostre, rassegne): iniziato prima del giorno in cui lo mostriamo. */
export function isOngoing(e: EventItem, day: string) {
  return dayKey(e.startsAt) < day;
}

export type Slot = "mattina" | "pomeriggio" | "sera";

/** Fascia oraria di inizio, in ora di Roma. Le ore piccole contano come sera. */
export function slotOf(e: EventItem): Slot {
  const h = romeHour(e.startsAt);
  return h >= 6 && h < 13 ? "mattina" : h >= 13 && h < 18 ? "pomeriggio" : "sera";
}

export type AgendaDay = {
  key: string;
  /** Eventi che iniziano (o sono tutto il giorno) in questa data, in ordine di inizio */
  events: EventItem[];
  /** Mostre e rassegne iniziate prima: raccolte a parte per non coprire le serate */
  ongoing: EventItem[];
};

const nextDay = (day: string) => new Date(Date.parse(`${day}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/** Evento tocca un sabato/domenica Roma in [from, to). */
export function touchesWeekend(e: EventItem, from: Date, to: Date): boolean {
  const start = Math.max(new Date(e.startsAt).getTime(), from.getTime());
  const end = Math.min(endOf(e).getTime(), to.getTime());
  if (start >= end) return false;

  // Ogni giorno di calendario dell'intersezione, ultimo (anche parziale) compreso
  const last = dayKey(new Date(end - 1).toISOString());
  for (let day = dayKey(new Date(start).toISOString()); ; day = nextDay(day)) {
    if (isWeekendDay(day)) return true;
    if (day >= last) return false;
  }
}

/**
 * Raggruppa per giorno di Roma. Gli eventi già iniziati (es. mostre) finiscono nel primo
 * giorno del periodo, separati dagli altri. Con `onlyStartingFrom` (stasera) restano solo
 * gli eventi con orario che iniziano da quell'istante.
 */
export function groupByDay(
  events: EventItem[],
  firstDay: string,
  now: Date,
  onlyStartingFrom?: Date,
): AgendaDay[] {
  const days = new Map<string, EventItem[]>();
  for (const e of events) {
    if (isOver(e, now)) continue;
    if (onlyStartingFrom && (e.allDay || new Date(e.startsAt) < onlyStartingFrom)) continue;
    const start = dayKey(e.startsAt);
    const key = start < firstDay ? firstDay : start;
    days.set(key, [...(days.get(key) ?? []), e]);
  }
  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => {
      const byStart = list.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.startsAt.localeCompare(b.startsAt));
      return {
        key,
        events: byStart.filter((e) => !isOngoing(e, key)),
        ongoing: byStart.filter((e) => isOngoing(e, key)),
      };
    });
}
