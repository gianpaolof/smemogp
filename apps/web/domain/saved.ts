/**
 * Eventi salvati: lista in localStorage, prima i più recenti. Puro: `now` sempre ultimo argomento.
 * Ogni voce è uno snapshot minimo, così badge dei futuri, titolo degli orfani e potatura
 * funzionano senza server.
 */
export type SavedEntry = Readonly<{
  id: string;
  /** null = migrato dal vecchio formato, completato alla prima visita di /salvati */
  title: string | null;
  /** Fine effettiva ISO (endsAt, o inizio + 3 h): dopo è «passato». null = ignota → conta come futuro */
  until: string | null;
}>;

/**
 * I passati restano visibili in «Passati» per questi giorni, poi escono. Allineato alla
 * retention dello scout (`pruneOldEvents`, apps/scout/src/index.ts: cutoff 7 giorni): oltre,
 * l'evento non è più nel DB e diventerebbe un orfano «Non più disponibile».
 */
export const KEEP_PAST_DAYS = 7;
/** Id letti dal server per /salvati: 150 × 41 caratteri ≈ 6 KB di URL. */
export const MAX_URL_IDS = 150;
const MAX_TITLE = 300;
const DAY_MS = 86_400_000;
const NONE: readonly SavedEntry[] = [];

export function isEventId(s: string): boolean {
  return /^[0-9a-f]{40}$/.test(s);
}

/** Da input non fidato (localStorage, altre versioni dell'app). Voci invalide scartate, duplicati tenendo il primo. */
export function parseSaved(raw: unknown): readonly SavedEntry[] {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return NONE;
    }
  }
  if (!Array.isArray(raw)) return NONE;
  const seen = new Set<string>();
  const out: SavedEntry[] = [];
  for (const item of raw) {
    const entry = toEntry(item);
    if (!entry || seen.has(entry.id)) continue;
    seen.add(entry.id);
    out.push(entry);
  }
  return out;
}

function toEntry(item: unknown): SavedEntry | null {
  // Vecchio formato: solo id
  if (typeof item === "string") return isEventId(item) ? { id: item, title: null, until: null } : null;
  if (typeof item !== "object" || item === null) return null;
  const { id, title, until } = item as Record<string, unknown>;
  if (typeof id !== "string" || !isEventId(id)) return null;
  return {
    id,
    title: typeof title === "string" && title !== "" ? title.slice(0, MAX_TITLE) : null,
    until: typeof until === "string" && !Number.isNaN(Date.parse(until)) ? until : null,
  };
}

export function isPastEntry(e: SavedEntry, now: Date): boolean {
  return e.until != null && Date.parse(e.until) <= now.getTime();
}

/** Salva in testa o toglie se c'è già. */
export function toggleEntry(
  list: readonly SavedEntry[],
  entry: SavedEntry,
): { list: readonly SavedEntry[]; saved: boolean } {
  if (list.some((e) => e.id === entry.id)) return { list: list.filter((e) => e.id !== entry.id), saved: false };
  return { list: [{ id: entry.id, title: entry.title, until: entry.until }, ...list], saved: true };
}

/** Via i passati da oltre `KEEP_PAST_DAYS`. Stesso riferimento se nulla cambia. */
export function pruneSaved(list: readonly SavedEntry[], now: Date): readonly SavedEntry[] {
  const limit = now.getTime() - KEEP_PAST_DAYS * DAY_MS;
  const kept = list.filter((e) => e.until == null || Date.parse(e.until) > limit);
  return kept.length === list.length ? list : kept;
}

/** Solo le prime `MAX_URL_IDS` voci, le stesse che /salvati chiede al server: badge = pagina. */
export function countUpcoming(list: readonly SavedEntry[], now: Date): number {
  return list.slice(0, MAX_URL_IDS).filter((e) => !isPastEntry(e, now)).length;
}

/** I più recenti, fino a `MAX_URL_IDS`. */
export function idsForUrl(list: readonly SavedEntry[]): string[] {
  return list.slice(0, MAX_URL_IDS).map((e) => e.id);
}

/** Aggiorna title/until con i dati del server; ordine invariato. Stesso riferimento se nulla cambia. */
export function mergeSnapshots(list: readonly SavedEntry[], found: readonly SavedEntry[]): readonly SavedEntry[] {
  const byId = new Map(found.map((f) => [f.id, f]));
  let changed = false;
  const next = list.map((e) => {
    const f = byId.get(e.id);
    if (!f || (f.title === e.title && f.until === e.until)) return e;
    changed = true;
    return { id: e.id, title: f.title, until: f.until };
  });
  return changed ? next : list;
}
