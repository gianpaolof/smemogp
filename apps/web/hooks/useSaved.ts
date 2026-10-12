"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  countUpcoming,
  mergeSnapshots,
  parseSaved,
  pruneSaved,
  toggleEntry,
  type SavedEntry,
} from "@/domain/saved";
import { readLocal, subscribeLocal, useLocalStore, writeLocal } from "./useLocalStore";

const KEY = "salvati";
const sub = (cb: () => void) => subscribeLocal(KEY, cb);
const unknownOnServer = () => null;

// parseSaved crea sempre un array nuovo: memorizzato sul valore grezzo (stabile finché il testo
// non cambia) per dare a useSyncExternalStore snapshot stabili. Niente `now` qui.
const NONE: readonly SavedEntry[] = parseSaved(null);
let lastRaw: unknown;
let lastParsed: readonly SavedEntry[] = NONE;
function entries(raw: unknown): readonly SavedEntry[] {
  // Vuoto (anche dal server in idratazione): costante, senza toccare la cache del browser
  if (raw == null) return NONE;
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastParsed = parseSaved(raw);
  }
  return lastParsed;
}

const current = () => entries(readLocal<unknown>(KEY, null));

export function useSavedEntries(): readonly SavedEntry[] {
  return entries(useLocalStore<unknown>(KEY, null));
}

/** null sul server e in idratazione: lo stato è solo nel browser. */
export function useIsSaved(id: string): boolean | null {
  const get = useCallback(() => current().some((e) => e.id === id), [id]);
  return useSyncExternalStore(sub, get, unknownOnServer);
}

/** Salvati non ancora passati; numero, quindi stabile per valore anche se dipende dall'ora. */
export function useUpcomingCount(): number | null {
  return useSyncExternalStore(subUpcoming, upcomingNow, unknownOnServer);
}
const upcomingNow = () => countUpcoming(current(), new Date());

const MIN_DELAY = 1000;
const MAX_DELAY = 24 * 60 * 60 * 1000;

/** Fine futura più vicina (ms), o null se nessun salvato ha un `until` futuro. */
function nextUntil(list: readonly SavedEntry[], now: number): number | null {
  let next: number | null = null;
  for (const e of list) {
    if (e.until == null) continue;
    const t = Date.parse(e.until);
    if (t > now && (next == null || t < next)) next = t;
  }
  return next;
}

// Come `sub`, ma avvisa anche quando il prossimo salvato finisce: il conteggio dipende dall'ora
function subUpcoming(cb: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = () => {
    clearTimeout(timer);
    timer = undefined;
    const now = Date.now();
    const next = nextUntil(current(), now);
    if (next == null) return;
    const delay = Math.min(MAX_DELAY, Math.max(MIN_DELAY, next - now));
    timer = setTimeout(() => {
      arm();
      cb();
    }, delay);
  };
  arm();
  const unsub = subscribeLocal(KEY, () => {
    arm();
    cb();
  });
  return () => {
    clearTimeout(timer);
    unsub();
  };
}

/** Ritorna true se ora è salvato. Legge fresco: mai da chiamare durante il render. */
export function toggleSaved(entry: SavedEntry): boolean {
  const before = current();
  const { list, saved } = toggleEntry(pruneSaved(before, new Date()), entry);
  writeLocal(KEY, list);
  // Primo salvataggio: chiede al browser di non sfrattare lo storage (best effort)
  if (saved && before.length === 0) navigator.storage?.persist?.().catch(() => {});
  return saved;
}

/** Per gli orfani (evento sparito dal server). */
export function removeSaved(id: string): void {
  const list = current();
  const next = list.filter((e) => e.id !== id);
  if (next.length !== list.length) writeLocal(KEY, next);
}

/** Completa gli snapshot con i dati del server e pota; scrive solo se cambia (niente ping-pong tra schede). */
export function syncSaved(found: readonly SavedEntry[]): void {
  const list = current();
  const next = pruneSaved(mergeSnapshots(list, found), new Date());
  if (next !== list) writeLocal(KEY, next);
}
