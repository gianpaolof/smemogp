"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, ViewTransition, type ReactNode } from "react";

/**
 * Pannello sopra lista/mappa per la rotta intercettata `/evento/[id]`.
 * Chiudere = tornare indietro nella history, così l'URL resta coerente.
 */
export function DetailPanel({ children }: { children: ReactNode }) {
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && router.back();
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      previous?.focus();
    };
  }, [router]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end">
      <ViewTransition enter="reveal" exit="reveal-out" default="none">
        <button
          type="button"
          aria-label="Chiudi dettaglio"
          onClick={() => router.back()}
          className="absolute inset-0 cursor-default bg-[var(--overlay)]"
        />
      </ViewTransition>
      <ViewTransition enter="panel-in" exit="panel-out" default="none">
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-title"
          tabIndex={-1}
          className="relative flex max-h-[92dvh] w-full flex-col overflow-y-auto overscroll-contain border-t border-line bg-bg outline-none sm:max-h-none sm:max-w-md sm:border-t-0 sm:border-l"
        >
          <div className="sticky top-0 z-10 flex justify-end border-b border-line bg-bg">
            <button type="button" onClick={() => router.back()} className="h-12 px-4 text-sm font-semibold hover:bg-line-soft">
              Chiudi ✕
            </button>
          </div>
          {children}
        </div>
      </ViewTransition>
    </div>
  );
}
