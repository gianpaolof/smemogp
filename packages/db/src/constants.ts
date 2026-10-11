// Costanti senza dipendenze: importabili anche da componenti client.

export const TORINO = { lat: 45.0703, lng: 7.6869 } as const;

export const CATEGORIES = [
  "musica",
  "teatro",
  "mostre",
  "cinema",
  "sagre",
  "food",
  "outdoor",
  "famiglie",
  "altro",
] as const;
export type Category = (typeof CATEGORIES)[number];
