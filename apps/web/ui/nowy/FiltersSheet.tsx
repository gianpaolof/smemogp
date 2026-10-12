"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { useFilterNavigation, type GpsFailure } from "@/hooks/useFilterNavigation";
import { haptic } from "@/hooks/useMotion";
import { useTheme, type ThemeChoice } from "@/hooks/useTheme";
import type { FilterPanelVM } from "@/ui/contracts";
import { Icon } from "./icons";

const GPS_MESSAGES: Record<GpsFailure, string> = {
  denied: "Permesso negato: abilita la posizione per questo sito nelle impostazioni del browser.",
  timeout: "La posizione non arriva. Riprova all'aperto o tra poco.",
  unavailable: "Posizione non disponibile in questo momento.",
  unsupported: "Questo browser non fornisce la posizione.",
};

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "Auto" },
  { value: "light", label: "Chiaro" },
  { value: "dark", label: "Scuro" },
];

const legend = "float-left mb-2 w-full text-[11px] font-bold tracking-[0.12em] text-muted uppercase";
const chip = "press flex h-11 items-center justify-center gap-1 border-r border-b border-line px-1 text-center text-xs font-semibold";

/** Indice dello step più vicino: lo slider scorre sugli step, non sui km. */
const nearestStep = (steps: readonly number[], km: number) =>
  steps.reduce((best, s, i) => (Math.abs(s - km) < Math.abs(steps[best] - km) ? i : best), 0);

export function FiltersSheet({
  vm,
  className = "",
  count,
}: {
  vm: FilterPanelVM;
  className?: string;
  /** Numero di risultati (server, in Suspense) per il pulsante di chiusura */
  count?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { pending, setRadius, setOrigin, locateMe } = useFilterNavigation(vm.path, vm.query);
  const { choice, setChoice } = useTheme();
  const steps = vm.radiusSteps;
  const [index, setIndex] = useState(() => nearestStep(steps, vm.radiusKm));
  const [syncedRadius, setSyncedRadius] = useState(vm.radiusKm);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  // L'URL è la fonte di verità: se cambia da fuori, riallinea la bozza dello slider
  if (vm.radiusKm !== syncedRadius) {
    setSyncedRadius(vm.radiusKm);
    setIndex(nearestStep(steps, vm.radiusKm));
  }
  const radius = steps[index];

  const activeCount = vm.categories.filter((c) => c.active).length;

  const locate = async () => {
    setGpsError(null);
    setLocating(true);
    try {
      await locateMe();
      haptic();
    } catch (reason) {
      setGpsError(GPS_MESSAGES[reason as GpsFailure] ?? GPS_MESSAGES.unavailable);
    } finally {
      setLocating(false);
    }
  };

  const commit = (i: number) => {
    const next = Math.min(steps.length - 1, Math.max(0, i));
    setIndex(next);
    setRadius(steps[next]);
    haptic(4);
  };

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className={className} aria-haspopup="dialog">
        <Icon name="sliders" />
        Filtri
        {activeCount > 0 && (
          <span className="bg-accent px-1 text-[10px] font-bold text-accent-fg tabular-nums">{activeCount}</span>
        )}
      </button>

      <dialog
        ref={dialog}
        className="sheet m-0 mt-auto max-h-[88dvh] w-full max-w-none border-t border-line bg-bg p-0 text-fg sm:mx-auto sm:mb-6 sm:max-w-lg sm:border"
        aria-labelledby="filters-title"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg pl-3">
          <h2 id="filters-title" className="display-title py-3 text-2xl">
            Filtri
          </h2>
          <div className="flex items-center">
            {vm.hasFilters && (
              <Link href={vm.resetHref} replace scroll={false} className="press flex h-12 items-center px-3 text-xs font-semibold underline underline-offset-4 hover:bg-line-soft">
                Azzera
              </Link>
            )}
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Chiudi filtri"
              className="press flex size-12 items-center justify-center border-l border-line text-lg hover:bg-line-soft"
            >
              <Icon name="close" />
            </button>
          </div>
        </div>

        <fieldset className="flow-root border-b border-line px-3 py-3">
          <legend className={legend}>Quando</legend>
          <div className="grid grid-cols-5 border-t border-l border-line">
            {vm.periods.map((p) => (
              <Link
                key={p.label}
                href={p.href}
                replace
                scroll={false}
                aria-current={p.active ? "true" : undefined}
                className={`${chip} ${p.active ? "bg-fg text-bg" : "hover:bg-line-soft"}`}
              >
                {p.label}
              </Link>
            ))}
          </div>
        </fieldset>

        <fieldset className="flow-root border-b border-line px-3 py-3">
          <legend className={legend}>Raggio</legend>
          <div className="flex items-end justify-between gap-3">
            <output htmlFor="radius" className="display-num text-[56px] leading-none">
              {radius}
              <span className="ml-1 align-baseline font-sans text-sm font-semibold tracking-normal">km</span>
            </output>
            <div className="flex">
              <button
                type="button"
                aria-label="Riduci raggio"
                onClick={() => commit(index - 1)}
                disabled={index === 0}
                className="press flex size-11 items-center justify-center border border-line text-lg hover:bg-line-soft disabled:text-line-soft"
              >
                <Icon name="minus" />
              </button>
              <button
                type="button"
                aria-label="Aumenta raggio"
                onClick={() => commit(index + 1)}
                disabled={index === steps.length - 1}
                className="press flex size-11 items-center justify-center border border-l-0 border-line text-lg hover:bg-line-soft disabled:text-line-soft"
              >
                <Icon name="plus" />
              </button>
            </div>
          </div>
          <label htmlFor="radius" className="sr-only">
            Raggio in chilometri
          </label>
          <input
            id="radius"
            type="range"
            className="nowy-range mt-3 w-full"
            min={0}
            max={steps.length - 1}
            step={1}
            value={index}
            aria-valuetext={`${radius} km`}
            onChange={(e) => setIndex(Number(e.target.value))}
            // Query solo al rilascio, non per ogni pixel
            onPointerUp={() => commit(index)}
            onKeyUp={() => commit(index)}
          />
          <p className="mt-1 flex justify-between text-[11px] text-muted tabular-nums">
            <span>{steps[0]} km</span>
            <span>in linea d&apos;aria</span>
            <span>{steps.at(-1)} km</span>
          </p>
        </fieldset>

        <fieldset className="flow-root border-b border-line px-3 py-3">
          <legend className={legend}>Da dove</legend>
          <div className="grid grid-cols-2 border border-line">
            <button
              type="button"
              onClick={locate}
              disabled={locating}
              aria-pressed={vm.usingCustomOrigin}
              className={`press flex h-11 items-center justify-center gap-1.5 border-r border-line text-sm font-semibold disabled:opacity-60 ${
                vm.usingCustomOrigin ? "bg-fg text-bg" : "hover:bg-line-soft"
              }`}
            >
              <Icon name="locate" />
              {locating ? "Localizzo…" : vm.usingCustomOrigin ? "La mia posizione" : "Usa la mia posizione"}
            </button>
            <button
              type="button"
              onClick={() => setOrigin(null)}
              aria-pressed={!vm.usingCustomOrigin}
              className={`press h-11 text-sm font-semibold ${!vm.usingCustomOrigin ? "bg-fg text-bg" : "hover:bg-line-soft"}`}
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

        <fieldset className="flow-root border-b border-line px-3 py-3">
          <legend className={legend}>Categorie</legend>
          <div className="grid grid-cols-3 border-t border-l border-line">
            {vm.categories.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                replace
                scroll={false}
                aria-current={c.active ? "true" : undefined}
                className={`${chip} ${c.active ? "bg-fg text-bg" : "hover:bg-line-soft"}`}
              >
                {c.active && <Icon name="check" />}
                {c.label}
              </Link>
            ))}
          </div>
        </fieldset>

        <fieldset className="flow-root px-3 py-3">
          <legend className={legend}>Tema</legend>
          <div className="grid grid-cols-3 border-t border-l border-line">
            {THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setChoice(t.value)}
                aria-pressed={choice === t.value}
                suppressHydrationWarning
                className={`${chip} ${choice === t.value ? "bg-fg text-bg" : "hover:bg-line-soft"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="sticky bottom-0 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="press flex h-14 w-full items-center justify-center gap-2 bg-fg text-sm font-semibold text-bg"
          >
            <span aria-live="polite">{pending ? "Aggiorno…" : <>Mostra {count ?? "gli eventi"}</>}</span>
          </button>
        </div>
      </dialog>
    </>
  );
}
