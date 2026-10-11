"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useFilterNavigation } from "@/hooks/useFilterNavigation";
import type { FilterPanelVM } from "@/ui/contracts";

export function FiltersSheet({ vm, className = "" }: { vm: FilterPanelVM; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { pending, setRadius, setOrigin, locateMe } = useFilterNavigation(vm.path, vm.query);
  const [radius, setRadiusDraft] = useState(vm.radiusKm);
  const [syncedRadius, setSyncedRadius] = useState(vm.radiusKm);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  // L'URL è la fonte di verità: se cambia da fuori, riallinea la bozza dello slider
  if (vm.radiusKm !== syncedRadius) {
    setSyncedRadius(vm.radiusKm);
    setRadiusDraft(vm.radiusKm);
  }

  const activeCount = vm.categories.filter((c) => c.active).length;

  const locate = async () => {
    setGpsError(null);
    setLocating(true);
    try {
      await locateMe();
    } catch {
      setGpsError("Posizione non disponibile. Ricerca da Torino centro.");
    } finally {
      setLocating(false);
    }
  };

  const step = (delta: number) => {
    const next = Math.min(vm.radiusMax, Math.max(vm.radiusMin, radius + delta));
    setRadiusDraft(next);
    setRadius(next);
  };

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className={className} aria-haspopup="dialog">
        + Filtri{activeCount > 0 && <span className="tabular-nums"> ({activeCount})</span>}
      </button>

      <dialog
        ref={dialog}
        className="sheet m-0 mt-auto max-h-[85dvh] w-full max-w-none border-t border-line bg-bg p-0 text-fg sm:mx-auto sm:mb-6 sm:max-w-lg sm:border"
        aria-labelledby="filters-title"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <div className="flex items-center justify-between border-b border-line px-3">
          <h2 id="filters-title" className="display-title py-3 text-2xl">
            Filtri
          </h2>
          <span aria-live="polite" className="text-xs font-semibold text-muted">
            {pending ? "Aggiornamento…" : ""}
          </span>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="h-12 px-3 text-sm font-semibold hover:bg-line-soft"
          >
            Chiudi
          </button>
        </div>

        <fieldset className="border-b border-line px-3 py-3">
          <legend className="sr-only">Raggio</legend>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="radius" className="text-xs font-semibold">
              Raggio{" "}
              <output htmlFor="radius" className="display-title text-3xl tabular-nums">
                {radius} km
              </output>
            </label>
            <div className="flex">
              <button
                type="button"
                aria-label="Riduci raggio"
                onClick={() => step(-1)}
                className="size-11 border border-line text-lg font-semibold hover:bg-line-soft"
              >
                −
              </button>
              <button
                type="button"
                aria-label="Aumenta raggio"
                onClick={() => step(1)}
                className="size-11 border border-l-0 border-line text-lg font-semibold hover:bg-line-soft"
              >
                +
              </button>
            </div>
          </div>
          <input
            id="radius"
            type="range"
            min={vm.radiusMin}
            max={vm.radiusMax}
            value={radius}
            onChange={(e) => setRadiusDraft(Number(e.target.value))}
            // Query solo al rilascio, non per ogni pixel
            onPointerUp={() => setRadius(radius)}
            onKeyUp={() => setRadius(radius)}
            className="mt-2 w-full"
          />
          <p className="text-xs text-muted">Distanza in linea d&apos;aria · {vm.radiusMin}–{vm.radiusMax} km</p>
        </fieldset>

        <fieldset className="border-b border-line px-3 py-3">
          <legend className="sr-only">Da dove</legend>
          <p className="text-xs font-semibold">
            Da: <span className="text-muted">{vm.originLabel}</span>
          </p>
          <div className="mt-2 grid grid-cols-2 border border-line">
            <button
              type="button"
              onClick={locate}
              disabled={locating}
              className="h-11 border-r border-line text-sm font-semibold hover:bg-line-soft disabled:opacity-60"
            >
              {locating ? "Localizzo…" : "Usa la mia posizione"}
            </button>
            <button
              type="button"
              onClick={() => setOrigin(null)}
              disabled={!vm.usingCustomOrigin}
              className="h-11 text-sm font-semibold hover:bg-line-soft disabled:text-muted"
            >
              Torino centro
            </button>
          </div>
          {gpsError && (
            <p role="alert" className="mt-2 text-xs text-muted">
              {gpsError}
            </p>
          )}
        </fieldset>

        <fieldset className="px-3 py-3">
          <legend className="pb-2 text-xs font-semibold">Categorie</legend>
          <div className="grid grid-cols-3 border-t border-l border-line">
            {vm.categories.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                replace
                scroll={false}
                aria-pressed={c.active}
                className={`flex h-12 items-center justify-center border-r border-b border-line px-1 text-center text-xs font-semibold ${
                  c.active ? "bg-fg text-bg" : "hover:bg-line-soft"
                }`}
              >
                {c.active && <span aria-hidden="true">✓&nbsp;</span>}
                {c.label}
              </Link>
            ))}
          </div>
        </fieldset>
      </dialog>
    </>
  );
}
