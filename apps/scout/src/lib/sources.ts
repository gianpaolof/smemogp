import { readFile } from "node:fs/promises";
import type { Source } from "../types";

export async function readCatalog(): Promise<Source[]> {
  const raw = await readFile(new URL("../../sources.json", import.meta.url), "utf8");
  return JSON.parse(raw) as Source[];
}

/** Fonti dello scout online: `active` e abilitate. Con `only` la singola fonte, qualunque stato. */
export async function loadSources(only?: string): Promise<Source[]> {
  const all = await readCatalog();
  if (only) {
    const hit = all.filter((s) => s.id === only);
    if (!hit.length) throw new Error(`Fonte "${only}" non nel catalogo`);
    return hit;
  }
  return all.filter((s) => s.enabled !== false && (s.status ?? "active") === "active");
}
