"use client";

import { removeSaved, useSavedEntries } from "@/hooks/useSaved";

/** Salvati che il catalogo non ha più: il titolo viene dallo snapshot nel browser. */
export function SavedOrphans({ ids }: { ids: readonly string[] }) {
  const entries = useSavedEntries();
  if (ids.length === 0) return null;
  const titles = new Map(entries.map((e) => [e.id, e.title]));

  return (
    <section aria-labelledby="salvati-orfani" className="border-t-2 border-fg">
      <h2
        id="salvati-orfani"
        className="border-b border-line px-3 pt-3 pb-1 text-[11px] font-bold tracking-[0.12em] text-muted uppercase"
      >
        Non più disponibili
      </h2>
      {ids.map((id) => (
        <div key={id} className="flex items-stretch border-b border-line last:border-b-0">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2.5">
            <span className="text-xs font-semibold text-muted">Non più disponibile</span>
            <p className="display-title line-clamp-2 text-[18px] text-muted line-through decoration-2">
              {titles.get(id) ?? "Evento"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => removeSaved(id)}
            className="press flex shrink-0 items-center border-l border-line px-3 text-xs font-semibold hover:bg-fg hover:text-bg"
          >
            Rimuovi
          </button>
        </div>
      ))}
    </section>
  );
}
