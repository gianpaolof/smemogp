"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Valori JSON in localStorage condivisi tra componenti (e schede, via evento `storage`).
 * Storage bloccato o assente: si legge il default, le scritture valgono solo in memoria.
 */
const listeners = new Map<string, Set<() => void>>();
const memory = new Map<string, string | null>();
const snapshots = new Map<string, { raw: string | null; value: unknown }>();
// Testo grezzo letto da localStorage: una sola getItem per cambiamento, non una per lettore.
// Invalidata su write e su evento `storage`.
const rawCache = new Map<string, string | null>();

function readRaw(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  if (rawCache.has(key)) return rawCache.get(key)!;
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    raw = null;
  }
  // Cache solo con il listener attivo: senza, un cambio da un'altra scheda non la invaliderebbe
  if (storageAttached) rawCache.set(key, raw);
  return raw;
}

function emit(key: string) {
  listeners.get(key)?.forEach((l) => l());
}

// Un solo listener `storage` per finestra, registrato al primo subscribe e tolto all'ultimo unsubscribe
let storageAttached = false;
function onStorage(e: StorageEvent) {
  if (e.key === null) {
    // localStorage.clear() in un'altra scheda: cambiano tutte le chiavi
    memory.clear();
    rawCache.clear();
    for (const key of [...listeners.keys()]) emit(key);
    return;
  }
  // Il valore dell'altra scheda vince sul fallback in memoria
  memory.delete(e.key);
  rawCache.delete(e.key);
  emit(e.key);
}

export function writeLocal<T>(key: string, value: T | null) {
  const raw = value == null ? null : JSON.stringify(value);
  rawCache.delete(key);
  try {
    if (raw == null) localStorage.removeItem(key);
    else localStorage.setItem(key, raw);
    memory.delete(key);
    if (storageAttached) rawCache.set(key, raw);
  } catch {
    memory.set(key, raw);
  }
  emit(key);
}

export function readLocal<T>(key: string, fallback: T): T {
  const raw = readRaw(key);
  const cached = snapshots.get(key);
  // Stesso riferimento finché il testo non cambia: richiesto da useSyncExternalStore
  if (cached && cached.raw === raw) return cached.value as T;
  let value: T = fallback;
  if (raw != null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = fallback;
    }
  }
  snapshots.set(key, { raw, value });
  return value;
}

/** Per selettori derivati con `useSyncExternalStore` (es. boolean per id). */
export function subscribeLocal(key: string, cb: () => void) {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(cb);
  if (!storageAttached) {
    // Senza ascolto la cache del raw potrebbe essere vecchia: si riparte da localStorage
    rawCache.clear();
    window.addEventListener("storage", onStorage);
    storageAttached = true;
  }
  return () => {
    set.delete(cb);
    if (set.size === 0 && listeners.get(key) === set) listeners.delete(key);
    if (storageAttached && listeners.size === 0) {
      window.removeEventListener("storage", onStorage);
      storageAttached = false;
      rawCache.clear();
    }
  };
}

/** `fallback` deve essere stabile (costante di modulo): è anche il valore lato server. */
export function useLocalStore<T>(key: string, fallback: T): T {
  const sub = useCallback((cb: () => void) => subscribeLocal(key, cb), [key]);
  return useSyncExternalStore(
    sub,
    () => readLocal(key, fallback),
    () => fallback,
  );
}
