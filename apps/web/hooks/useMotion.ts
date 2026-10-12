"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** true se l'utente chiede meno movimento. Lato server: true (nessuna animazione prima dell'idratazione). */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => true);
}

/** Vibrazione breve di conferma (solo Android: iOS non ha la Vibration API). */
export function haptic(ms = 8) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  if (window.matchMedia(QUERY).matches) return;
  navigator.vibrate(ms);
}
