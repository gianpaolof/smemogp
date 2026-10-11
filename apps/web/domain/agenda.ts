import type { EventItem } from "./types";
import { dayKey } from "./time";

/** Senza orario di fine, un evento si considera concluso 3 ore dopo l'inizio. */
const DEFAULT_DURATION_MS = 3 * 3_600_000;

export function isOver(e: EventItem, now: Date) {
  const end = e.endsAt ? new Date(e.endsAt) : new Date(new Date(e.startsAt).getTime() + DEFAULT_DURATION_MS);
  return end <= now;
}

/** In corso su più giorni (mostre, rassegne): iniziato prima del giorno in cui lo mostriamo. */
export function isOngoing(e: EventItem, day: string) {
  return dayKey(e.startsAt) < day;
}

export type AgendaDay = { key: string; events: EventItem[] };

/**
 * Raggruppa per giorno di Roma. Gli eventi già iniziati (es. mostre) finiscono nel primo
 * giorno del periodo, in cima, invece che nel giorno di inizio.
 */
export function groupByDay(events: EventItem[], firstDay: string, now: Date): AgendaDay[] {
  const days = new Map<string, EventItem[]>();
  for (const e of events) {
    if (isOver(e, now)) continue;
    const start = dayKey(e.startsAt);
    const key = start < firstDay ? firstDay : start;
    days.set(key, [...(days.get(key) ?? []), e]);
  }
  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => ({
      key,
      events: list.sort((a, b) => {
        const oa = isOngoing(a, key) || a.allDay ? 0 : 1;
        const ob = isOngoing(b, key) || b.allDay ? 0 : 1;
        return oa - ob || a.startsAt.localeCompare(b.startsAt);
      }),
    }));
}
