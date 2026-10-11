"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import type { MapVM } from "@/ui/contracts";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-line-soft" />,
});

const ctrl = "flex size-12 items-center justify-center border-b border-line bg-bg text-lg font-semibold last:border-b-0 hover:bg-line-soft";

export function MapScreen({ vm }: { vm: MapVM }) {
  const [selectedId, setSelectedId] = useState<string | null>(vm.selectedId ?? vm.rows[0]?.id ?? null);
  const [fitKey, setFitKey] = useState(0);
  const index = vm.rows.findIndex((r) => r.id === selectedId);
  const row = index >= 0 ? vm.rows[index] : null;

  const move = (delta: number) => {
    if (!vm.rows.length) return;
    setSelectedId(vm.rows[(index + delta + vm.rows.length) % vm.rows.length].id);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-[320px] flex-1">
        {/* Altezza esplicita: Leaflet non segue il flex del contenitore */}
        <div className="absolute inset-0">
          <LeafletMap vm={vm} selectedId={selectedId} onSelect={setSelectedId} fitKey={fitKey} />
        </div>
        <div className="absolute top-3 right-0 z-[500] flex flex-col border border-r-0 border-line">
          <button type="button" className={ctrl} onClick={() => setFitKey((k) => k + 1)} aria-label="Inquadra raggio">
            <span className="text-[11px]">{vm.radiusKm}km</span>
          </button>
        </div>
      </div>

      {row ? (
        <section aria-label="Evento selezionato" aria-live="polite" className="border-t border-line bg-bg">
          <Link
            href={row.href}
            scroll={false}
            className="grid grid-cols-[88px_minmax(0,1fr)] bg-accent text-accent-fg"
          >
            <div className="flex flex-col border-r border-line px-3 py-2.5">
              <span className="display-num text-[64px]">{row.dayNum}</span>
              <span className="pt-1 text-[11px] font-semibold">{row.dayLabel}</span>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5 px-3 py-2.5">
              <span className="text-xs font-semibold tabular-nums">{row.kicker}</span>
              <h2 className="display-title line-clamp-2 text-2xl">{row.title}</h2>
              {row.meta && <span className="text-xs">{row.meta}</span>}
            </div>
          </Link>
          <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] border-t border-line">
            <button type="button" onClick={() => move(-1)} aria-label="Evento precedente" className="h-12 border-r border-line hover:bg-line-soft">
              ←
            </button>
            <span className="flex items-center justify-center text-xs font-semibold tabular-nums">
              {index + 1} / {vm.rows.length}
            </span>
            <button type="button" onClick={() => move(1)} aria-label="Evento successivo" className="h-12 border-l border-line hover:bg-line-soft">
              →
            </button>
          </div>
        </section>
      ) : (
        <p role="status" className="border-t border-line px-3 py-4 text-sm text-muted">
          Nessun evento nel raggio. Allarga il raggio dai filtri.
        </p>
      )}
    </div>
  );
}
