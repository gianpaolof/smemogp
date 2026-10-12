"use client";

import { useSyncExternalStore } from "react";

const KEY = "ultima-visita";
let previous: number | null | undefined;

/** Istante della visita precedente: letto una volta per caricamento, poi aggiornato a ora. */
function lastVisit(): number | null {
  if (previous !== undefined) return previous;
  try {
    const v = Number(localStorage.getItem(KEY));
    previous = Number.isFinite(v) && v > 0 ? v : null;
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    previous = null;
  }
  return previous;
}

const noop = () => () => {};

/** «Nuovo» sugli eventi arrivati dopo l'ultima visita. Prima visita: nessun badge. */
export function NewBadge({ addedAt }: { addedAt: number }) {
  const since = useSyncExternalStore(noop, lastVisit, () => null);
  if (since == null || addedAt <= since) return null;
  return (
    <span className="ml-1.5 inline-block bg-fg px-1 py-px align-[1px] text-[10px] font-bold tracking-wide text-bg uppercase">
      Nuovo
    </span>
  );
}
