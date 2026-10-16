import "server-only";
import catalog from "../../scout/sources.json";

export type PublicSource = { name: string; url: string };

/** Fonti online (status `active`) per il colophon: solo nome e indirizzo, mai le note interne. */
export const activeSources: PublicSource[] = catalog
  .filter((s) => s.status === "active")
  .map((s) => ({ name: s.name, url: s.url }))
  .sort((a, b) => a.name.localeCompare(b.name, "it"));
