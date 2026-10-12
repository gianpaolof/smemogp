"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { haptic } from "@/hooks/useMotion";
import type { MapVM } from "@/ui/contracts";
import { EmptyState } from "./EmptyState";
import { EventImage } from "./EventImage";
import { Icon } from "./icons";
import { NewBadge } from "./NewBadge";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-line-soft" />,
});

const ctrl = "press flex size-12 items-center justify-center border-b border-line bg-bg text-lg font-semibold last:border-b-0 hover:bg-line-soft";

const placeKey = (r: { lat: number; lng: number }) => `${r.lat.toFixed(5)},${r.lng.toFixed(5)}`;

/** Soglia di spostamento orizzontale (px) perché un trascinamento sulla card cambi evento. */
const SWIPE_PX = 56;

export function MapScreen({ vm }: { vm: MapVM }) {
  const [selectedId, setSelectedId] = useState<string | null>(vm.selectedId);
  // La mappa si sposta sul marker solo se la scelta è dell'utente (tap o ?evento=), non all'apertura
  const [focusSelected, setFocusSelected] = useState(vm.selectedId !== null);
  const [place, setPlace] = useState<string | null>(null);
  const placeRows = place ? vm.rows.filter((r) => placeKey(r) === place) : [];
  const rows = placeRows.length ? placeRows : vm.rows;
  const [fitKey, setFitKey] = useState(0);
  const index = Math.max(0, rows.findIndex((r) => r.id === selectedId));
  const row = rows[index] ?? null;

  const select = (id: string, key: string | null) => {
    setSelectedId(id);
    setPlace(key);
    setFocusSelected(true);
    // La selezione sta nell'URL (condivisibile, sopravvive al ricaricamento) senza rifare la richiesta
    const url = new URL(window.location.href);
    url.searchParams.set("evento", id);
    window.history.replaceState(null, "", url);
  };

  const move = (delta: number) => {
    if (rows.length < 2) return;
    const next = rows[(index + delta + rows.length) % rows.length];
    haptic(4);
    select(next.id, place);
  };

  const onMarker = (id: string, key: string) => {
    const here = vm.rows.filter((r) => placeKey(r) === key).length;
    haptic();
    // Un solo evento nel luogo: nessun sottoinsieme, le frecce continuano a scorrere tutti
    select(id, here > 1 ? key : null);
  };

  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const t = touch.current;
    touch.current = null;
    if (!t) return;
    const dx = e.changedTouches[0].clientX - t.x;
    const dy = e.changedTouches[0].clientY - t.y;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
  };

  if (vm.empty) {
    return (
      <div className="flex-1">
        <EmptyState vm={vm.empty} />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* isolate: z-index di Leaflet (pane 400–800) e del pulsante restano qui dentro,
          sotto pannello dettaglio e dialog (z-50) */}
      <div className="relative isolate min-h-[260px] flex-1">
        {/* Altezza esplicita: Leaflet non segue il flex del contenitore */}
        <div className="absolute inset-0">
          <LeafletMap vm={vm} selectedId={row?.id ?? null} focusSelected={focusSelected} onSelect={onMarker} fitKey={fitKey} />
        </div>
        <div className="absolute top-3 right-0 z-[500] flex flex-col border border-r-0 border-line">
          <button
            type="button"
            className={`${ctrl} flex-col gap-0.5`}
            onClick={() => setFitKey((k) => k + 1)}
            aria-label={`${vm.radiusKm} km, inquadra raggio`}
          >
            <Icon name="fit" className="text-base" />
            <span className="text-[10px] leading-none">{vm.radiusKm} km</span>
          </button>
        </div>
      </div>

      {row ? (
        <section
          aria-label="Evento selezionato"
          aria-live="polite"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="border-t border-line bg-bg pb-[env(safe-area-inset-bottom)]"
        >
          {placeRows.length > 0 && (
            <>
              <div className="flex min-h-11 items-center justify-between gap-2 border-b border-line px-3 text-xs font-semibold">
                <span>{rows.length === 1 ? "1 evento qui" : `${rows.length} eventi qui`}</span>
                <button type="button" onClick={() => setPlace(null)} className="press min-h-11 underline underline-offset-4">
                  Tutti nel raggio
                </button>
              </div>
              {rows.length > 1 && (
                <ul aria-label="Eventi in questo luogo" className="max-h-24 overflow-y-auto overscroll-contain border-b border-line">
                  {rows.map((event) => (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => select(event.id, place)}
                        aria-current={event.id === row.id ? "true" : undefined}
                        className="press flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-xs hover:bg-line-soft aria-current:bg-line-soft"
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
            className="press grid grid-cols-[88px_minmax(0,1fr)] bg-accent text-accent-fg"
          >
            <div className="flex flex-col border-r border-line px-3 py-2.5">
              <span className="display-num text-[56px]">{row.dayNum}</span>
              <span className="pt-1 text-[11px] font-semibold">{row.dayLabel}</span>
            </div>
            <div className="flex min-w-0 items-center gap-3 px-3 py-2.5">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-xs font-semibold tabular-nums">
                  {row.kicker}
                  <NewBadge addedAt={row.addedAt} />
                </span>
                <h2 className="display-title line-clamp-2 text-2xl">{row.title}</h2>
                {row.meta && <span className="truncate text-xs">{row.meta}</span>}
              </div>
              {row.imageUrl && <EventImage src={row.imageUrl} sizes="64px" className="size-16 shrink-0" />}
            </div>
          </Link>
          {rows.length > 1 && (
            <Pager index={index} total={rows.length} onPrev={() => move(-1)} onNext={() => move(1)} />
          )}
        </section>
      ) : (
        <p role="status" className="border-t border-line px-3 py-4 text-sm text-muted">
          Nessun evento nel raggio. Allarga il raggio dai filtri.
        </p>
      )}
    </div>
  );
}

function Pager({ index, total, onPrev, onNext }: { index: number; total: number; onPrev: () => void; onNext: () => void }): ReactNode {
  return (
    <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] border-t border-line">
      <button type="button" onClick={onPrev} aria-label="Evento precedente" className="press flex h-12 items-center justify-center border-r border-line hover:bg-line-soft">
        <Icon name="left" />
      </button>
      <span className="flex items-center justify-center text-xs font-semibold tabular-nums">
        {index + 1} / {total}
      </span>
      <button type="button" onClick={onNext} aria-label="Evento successivo" className="press flex h-12 items-center justify-center border-l border-line hover:bg-line-soft">
        <Icon name="right" />
      </button>
    </div>
  );
}
