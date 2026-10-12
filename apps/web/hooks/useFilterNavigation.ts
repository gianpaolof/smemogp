"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { hrefWith, parseFilters, withOrigin } from "@/domain/filters";
import type { Filters, LatLng } from "@/domain/types";
import { writeLocal } from "./useLocalStore";

/** Posizione e raggio scelti: riapplicati all'apertura se l'URL non li indica (vedi RestoreFilters). */
export const REMEMBERED_KEY = "filtri-ricordati";
export type Remembered = { radiusKm?: number; origin?: LatLng | null };

export type GpsFailure = "denied" | "timeout" | "unavailable" | "unsupported";

/** Azioni sui filtri che non sono semplici link: raggio, posizione. Aggiornano l'URL in una transition. */
export function useFilterNavigation(path: string, query: string) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const current = parseFilters(new URLSearchParams(query));

  const go = (next: Filters) => {
    writeLocal<Remembered>(REMEMBERED_KEY, { radiusKm: next.radiusKm, origin: next.origin });
    startTransition(() => router.replace(hrefWith(path, next), { scroll: false }));
  };

  const setRadius = (radiusKm: number) => {
    if (radiusKm !== current.radiusKm) go({ ...current, radiusKm });
  };

  const setOrigin = (origin: LatLng | null) => go(withOrigin(current, origin));

  const locateMe = () =>
    new Promise<void>((resolve, reject: (reason: GpsFailure) => void) => {
      if (!("geolocation" in navigator)) return reject("unsupported");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          resolve();
        },
        (err) =>
          reject(err.code === err.PERMISSION_DENIED ? "denied" : err.code === err.TIMEOUT ? "timeout" : "unavailable"),
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
      );
    });

  return { pending, setRadius, setOrigin, locateMe };
}
