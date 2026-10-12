"use client";

import { useSyncExternalStore } from "react";
import { isPastEntry } from "@/domain/saved";
import { removeSaved, useSavedEntries } from "@/hooks/useSaved";

const noSubscribe = () => () => {};
// Al minuto: numero stabile per useSyncExternalStore (una Date nuova a ogni lettura non lo sarebbe)
const minuteNow = () => Math.floor(Date.now() / 60_000);
const unknownOnServer = () => null;

/**
 * Salvati che il catalogo non ha più: il titolo viene dallo snapshot nel browser.
 * Sul server e in idratazione si mostrano tutti gli `ids` (niente mismatch); poi solo quelli ancora
 * nello storage (così «Rimuovi» fa sparire la riga subito) e non già conclusi: un passato potato dal
 * DB non è «sparito», è solo finito.
 */
export function SavedOrphans({ ids }: { ids: readonly string[] }) {
  const entries = useSavedEntries();
  const minute = useSyncExternalStore(noSubscribe, minuteNow, unknownOnServer);

  const byId = new Map(entries.map((e) => [e.id, e]));
  const now = minute === null ? null : new Date(minute * 60_000);
  const visible =
    now === null
      ? ids
      : ids.filter((id) => {
          const e = byId.get(id);
          return e !== undefined && !isPastEntry(e, now);
        });
  if (visible.length === 0) return null;

  return (
    <section aria-labelledby="salvati-orfani" className="border-t-2 border-fg">
      <h2
        id="salvati-orfani"
        className="border-b border-line px-3 pt-3 pb-1 text-[11px] font-bold tracking-[0.12em] text-muted uppercase"
      >
        Non più disponibili
      </h2>
      {visible.map((id) => (
        <div key={id} className="flex items-stretch border-b border-line last:border-b-0">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2.5">
            <span className="text-xs font-semibold text-muted">Non più disponibile</span>
            <p className="display-title line-clamp-2 text-[18px] text-muted line-through decoration-2">
              {byId.get(id)?.title ?? "Evento"}
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
