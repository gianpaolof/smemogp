"use client";

import { useLocalStore, writeLocal, readLocal } from "./useLocalStore";

const KEY = "salvati";
const NONE: string[] = [];
/** Oltre, i più vecchi escono: gli id finiscono nell'URL di /salvati */
const MAX = 60;

export function useSaved() {
  return useLocalStore(KEY, NONE);
}

export function toggleSaved(id: string): boolean {
  const ids = readLocal(KEY, NONE);
  const saved = !ids.includes(id);
  writeLocal(KEY, saved ? [id, ...ids].slice(0, MAX) : ids.filter((x) => x !== id));
  return saved;
}
