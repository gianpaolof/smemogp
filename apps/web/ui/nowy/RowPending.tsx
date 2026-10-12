"use client";

import { useLinkStatus } from "next/link";

/**
 * Barra sotto la riga mentre il dettaglio carica. Il pannello aspetta i dati per far volare il
 * titolo (niente scheletro), quindi su rete lenta serve un segno che il tocco è arrivato.
 * Compare solo dopo 150 ms: sulle aperture rapide non si vede.
 */
export function RowPending() {
  const { pending } = useLinkStatus();
  return <span aria-hidden="true" className={`row-pending ${pending ? "is-pending" : ""}`} />;
}
