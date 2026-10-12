"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { hrefWith, parseFilters } from "@/domain/filters";
import { readLocal } from "@/hooks/useLocalStore";
import { REMEMBERED_KEY, type Remembered } from "@/hooks/useFilterNavigation";

const NONE: Remembered = {};

/**
 * All'apertura senza raggio né posizione nell'URL, riapplica quelli scelti l'ultima volta.
 * Un link condiviso con parametri espliciti vince sempre.
 */
export function RestoreFilters({ path, query }: { path: string; query: string }) {
  const router = useRouter();
  useEffect(() => {
    const params = new URLSearchParams(query);
    if (params.has("raggio") || params.has("lat")) return;
    const saved = readLocal(REMEMBERED_KEY, NONE);
    const f = parseFilters(params);
    const next = { ...f, radiusKm: saved.radiusKm ?? f.radiusKm, origin: saved.origin ?? null };
    if (next.radiusKm === f.radiusKm && !next.origin) return;
    router.replace(hrefWith(path, next), { scroll: false });
    // Solo al primo montaggio: dopo, l'URL è la fonte di verità
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
