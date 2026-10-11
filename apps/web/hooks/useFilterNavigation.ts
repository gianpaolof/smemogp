"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { hrefWith, parseFilters, withOrigin } from "@/domain/filters";
import type { Filters, LatLng } from "@/domain/types";

/** Azioni sui filtri che non sono semplici link: raggio, posizione. Aggiornano l'URL in una transition. */
export function useFilterNavigation(path: string, query: string) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const current = parseFilters(new URLSearchParams(query));

  const go = (next: Filters) =>
    startTransition(() => router.replace(hrefWith(path, next), { scroll: false }));

  const setRadius = (radiusKm: number) => {
    if (radiusKm !== current.radiusKm) go({ ...current, radiusKm });
  };

  const setOrigin = (origin: LatLng | null) => go(withOrigin(current, origin));

  const locateMe = () =>
    new Promise<void>((resolve, reject) => {
      if (!("geolocation" in navigator)) return reject(new Error("unsupported"));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          resolve();
        },
        (err) => reject(err),
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
      );
    });

  return { pending, setRadius, setOrigin, locateMe };
}
