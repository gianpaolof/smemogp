"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, ViewTransition, type ReactNode } from "react";
import { haptic } from "@/hooks/useMotion";
import { Icon } from "./icons";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** Oltre questa frazione dell'altezza (o con un colpo veloce) il pannello si chiude. */
const DISMISS_RATIO = 0.25;
const FLICK_PX_PER_MS = 0.6;

/**
 * Pannello sopra lista/mappa per la rotta intercettata `/evento/[id]`.
 * Chiudere = tornare indietro nella history, così l'URL resta coerente.
 */
export function DetailPanel({ children }: { children: ReactNode }) {
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = panel.current;
    const previous = document.activeElement as HTMLElement | null;
    el?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return router.back();
      // aria-modal: il Tab gira dentro il pannello
      if (e.key !== "Tab" || !el) return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1)!;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === el)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !el.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      previous?.focus();
    };
  }, [router]);

  // Trascina giù dalla maniglia (o dal pannello già in cima) per chiudere. Solo touch, solo mobile.
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const el = panel.current;
    if (!el || el.scrollTop > 0 || matchMedia("(min-width: 640px)").matches) return;
    drag.current = { y: e.touches[0].clientY, t: performance.now(), dy: 0 };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const d = drag.current;
    const el = panel.current;
    if (!d || !el) return;
    d.dy = Math.max(0, e.touches[0].clientY - d.y);
    el.style.transition = "none";
    el.style.translate = `0 ${d.dy}px`;
  };
  const onTouchEnd = () => {
    const d = drag.current;
    const el = panel.current;
    drag.current = null;
    if (!d || !el) return;
    const speed = d.dy / Math.max(1, performance.now() - d.t);
    if (d.dy > el.offsetHeight * DISMISS_RATIO || (d.dy > 40 && speed > FLICK_PX_PER_MS)) {
      haptic();
      el.style.transition = "translate 180ms ease-in";
      el.style.translate = "0 100%";
      setTimeout(() => router.back(), 160);
    } else {
      el.style.transition = "translate 220ms cubic-bezier(0.2, 0, 0, 1)";
      el.style.translate = "0 0";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end">
      <ViewTransition enter="reveal" exit="reveal-out" default="none">
        <button
          type="button"
          aria-label="Chiudi dettaglio"
          tabIndex={-1}
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
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
          className="relative flex max-h-[92dvh] w-full flex-col overflow-y-auto overscroll-contain border-t border-line bg-bg outline-none sm:max-h-none sm:max-w-md sm:border-t-0 sm:border-l sm:pt-[env(safe-area-inset-top)]"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg">
            {/* Maniglia: indica che il pannello si trascina giù */}
            <span aria-hidden="true" className="ml-3 h-1 w-10 bg-line-soft sm:invisible" />
            <button
              type="button"
              onClick={() => router.back()}
              className="press flex h-12 items-center gap-1.5 px-4 text-sm font-semibold hover:bg-line-soft"
            >
              Chiudi
              <Icon name="close" />
            </button>
          </div>
          {children}
        </div>
      </ViewTransition>
    </div>
  );
}
