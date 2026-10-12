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
  const [place, setPlace] = useState<string | null>(null);
  const placeRows = place ? vm.rows.filter((r) => `${r.lat.toFixed(5)},${r.lng.toFixed(5)}` === place) : [];
  const rows = placeRows.length ? placeRows : vm.rows;
  const [fitKey, setFitKey] = useState(0);
  const index = Math.max(0, rows.findIndex((r) => r.id === selectedId));
  const row = rows[index] ?? null;

  const move = (delta: number) => {
    if (!rows.length) return;
    setSelectedId(rows[(index + delta + rows.length) % rows.length].id);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* isolate: z-index di Leaflet (pane 400–800) e del pulsante restano qui dentro,
          sotto pannello dettaglio e dialog (z-50) */}
      <div className="relative isolate min-h-[320px] flex-1">
        {/* Altezza esplicita: Leaflet non segue il flex del contenitore */}
        <div className="absolute inset-0">
          <LeafletMap vm={vm} selectedId={row?.id ?? null} onSelect={(id, key) => { setSelectedId(id); setPlace(key); }} fitKey={fitKey} />
        </div>
        <div className="absolute top-3 right-0 z-[500] flex flex-col border border-r-0 border-line">
          <button type="button" className={ctrl} onClick={() => setFitKey((k) => k + 1)} aria-label="Inquadra raggio">
            <span className="text-[11px]">{vm.radiusKm}km</span>
          </button>
        </div>
      </div>

      {row ? (
        <section aria-label="Evento selezionato" aria-live="polite" className="border-t border-line bg-bg">
          {placeRows.length > 0 && (
            <>
              <div className="flex min-h-11 items-center justify-between gap-2 border-b border-line px-3 text-xs font-semibold">
                <span>{rows.length === 1 ? "1 evento qui" : `${rows.length} eventi qui`}</span>
                <button type="button" onClick={() => setPlace(null)} className="min-h-11 underline underline-offset-4">
                  Tutti gli eventi
                </button>
              </div>
              {rows.length > 1 && (
                <ul aria-label="Eventi in questo luogo" className="max-h-32 overflow-y-auto overscroll-contain border-b border-line">
                  {rows.map((event) => (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(event.id)}
                        aria-current={event.id === row.id ? "true" : undefined}
                        className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-xs hover:bg-line-soft aria-current:bg-line-soft"
                      >
                        <span className="shrink-0 font-semibold">{event.dayNum} {event.dayLabel}</span>
                        <span className="min-w-0 truncate">{event.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
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
              {index + 1} / {rows.length}
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
