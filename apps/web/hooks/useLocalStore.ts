"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Valori JSON in localStorage condivisi tra componenti (e schede, via evento `storage`).
 * Storage bloccato o assente: si legge il default, le scritture valgono solo in memoria.
 */
const listeners = new Map<string, Set<() => void>>();
const memory = new Map<string, string | null>();
const snapshots = new Map<string, { raw: string | null; value: unknown }>();

function readRaw(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function emit(key: string) {
  listeners.get(key)?.forEach((l) => l());
}

export function writeLocal<T>(key: string, value: T | null) {
  const raw = value == null ? null : JSON.stringify(value);
  try {
    if (raw == null) localStorage.removeItem(key);
    else localStorage.setItem(key, raw);
    memory.delete(key);
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
  const onStorage = (e: StorageEvent) => e.key === key && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    set.delete(cb);
    window.removeEventListener("storage", onStorage);
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
