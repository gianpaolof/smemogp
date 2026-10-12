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
let lastRaw: unknown;
let lastParsed: readonly SavedEntry[] = parseSaved(null);
function entries(raw: unknown): readonly SavedEntry[] {
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
  return useSyncExternalStore(sub, upcomingNow, unknownOnServer);
}
const upcomingNow = () => countUpcoming(current(), new Date());

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
