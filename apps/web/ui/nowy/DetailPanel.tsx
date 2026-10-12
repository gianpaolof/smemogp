"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, ViewTransition, type ReactNode } from "react";
import { DESKTOP_QUERY } from "@/hooks/useMediaQuery";
import { haptic } from "@/hooks/useMotion";
import { Icon } from "./icons";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** Oltre questa frazione dell'altezza (o con un colpo veloce) il pannello si chiude. */
const DISMISS_RATIO = 0.25;
const FLICK_PX_PER_MS = 0.6;

/**
 * Risolve quando `done()` è vero, o comunque dopo `ms`. Timer e non requestAnimationFrame:
 * durante l'aggiornamento di una view transition il rendering è sospeso e i frame non arrivano.
 */
const waitFor = (done: () => boolean, ms = 1000) =>
  new Promise<void>((resolve) => {
    const start = performance.now();
    const tick = () => (done() || performance.now() - start > ms ? resolve() : setTimeout(tick, 16));
    tick();
  });

const tag = (el: HTMLElement, name: string, cls: string) => {
  el.style.setProperty("view-transition-name", name);
  el.style.setProperty("view-transition-class", cls);
};
const untag = (el: HTMLElement) => {
  el.style.removeProperty("view-transition-name");
  el.style.removeProperty("view-transition-class");
};
const inViewport = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
};

/**
 * Pannello sopra lista/mappa per la rotta intercettata `/evento/[id]`.
 * Chiudere = tornare indietro nella history, così l'URL resta coerente.
 */
export function DetailPanel({ children }: { children: ReactNode }) {
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);

  // router.back() è un popstate: React lo applica in modo sincrono, senza view transition.
  // La avviamo qui e diamo noi i nomi (data-hero): titolo e giorno tornano in volo nella riga
  // mentre il pannello svanisce. Il back del browser chiude senza morph.
  // Una sola chiusura alla volta: Esc tenuto premuto o Esc + Chiudi farebbero due passi indietro
  const closing = useRef(false);
  const close = useCallback(() => {
    const el = panel.current;
    if (closing.current) return;
    closing.current = true;
    // Il trascinamento lascia il pannello spostato: se Next lo conserva nascosto, con Avanti tornerebbe così
    const resetDrag = () => {
      el?.style.removeProperty("translate");
      el?.style.removeProperty("transition");
    };
    if (!el || !document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.back();
      return resetDrag();
    }
    const tagged: HTMLElement[] = [];
    const mark = (node: HTMLElement, name: string, cls: string) => {
      tag(node, name, cls);
      tagged.push(node);
    };
    const cleanup = () => tagged.forEach(untag);
    const heroes = [...el.querySelectorAll<HTMLElement>("[data-hero]")];
    mark(el, "detail-panel", "panel-out");
    for (const h of heroes) mark(h, h.dataset.hero!, "hero");
    const from = location.pathname;
    const transition = document.startViewTransition(async () => {
      router.back();
      // Finché l'URL non cambia il browser non dipinge: attesa breve
      await waitFor(() => location.pathname !== from, 400);
      await new Promise((r) => setTimeout(r, 0)); // commit di React
      cleanup();
      resetDrag();
      // Indietro può portare a un altro evento (desktop): il pannello resta, niente volo
      if (el.isConnected && el.checkVisibility()) {
        closing.current = false;
        return;
      }
      for (const h of heroes) {
        const target = [...document.querySelectorAll<HTMLElement>(`[data-hero="${h.dataset.hero}"]`)].find(
          (n) => !el.contains(n) && n.checkVisibility() && inViewport(n),
        );
        if (target) mark(target, h.dataset.hero!, "hero");
      }
    });
    transition.ready.catch(() => {}); // saltata da un'altra transizione: va bene così
    transition.finished.then(cleanup, cleanup);
  }, [router]);

  useEffect(() => {
    const el = panel.current;
    closing.current = false; // pannello (ri)mostrato, anche con Avanti
    const previous = document.activeElement as HTMLElement | null;
    el?.focus();
    // Desktop: il pannello sta accanto alla lista e sopra la mappa, che resta usabile → non modale
    const desktop = matchMedia(DESKTOP_QUERY).matches;
    el?.setAttribute("aria-modal", desktop ? "false" : "true");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      // aria-modal: il Tab gira dentro il pannello (solo se modale)
      if (desktop || e.key !== "Tab" || !el) return;
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
    if (!desktop) document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      previous?.focus();
    };
  }, [close]);

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
      // Si chiude da dove l'hai lasciato: il titolo vola da lì alla riga
      haptic();
      close();
    } else {
      el.style.transition = "translate 220ms cubic-bezier(0.2, 0, 0, 1)";
      el.style.translate = "0 0";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end lg:pointer-events-none lg:inset-auto lg:top-0 lg:right-0 lg:bottom-0 lg:w-[440px]">
      <ViewTransition enter="reveal" exit="reveal-out" default="none">
        <button
          type="button"
          aria-label="Chiudi dettaglio"
          tabIndex={-1}
          onClick={close}
          className="absolute inset-0 cursor-default bg-[var(--overlay)] lg:hidden"
        />
      </ViewTransition>
      {/* Dalla lista (tipo hero) titolo e giorno arrivano in volo: il pannello compare attorno, non sale */}
      <ViewTransition enter={{ hero: "panel-fade", default: "panel-in" }} exit="panel-out" default="none">
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
          className="relative flex lg:pointer-events-auto max-h-[92dvh] w-full flex-col overflow-y-auto overscroll-contain border-t border-line bg-bg outline-none sm:max-h-none sm:max-w-md sm:border-t-0 sm:border-l sm:pt-[env(safe-area-inset-top)]"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg">
            {/* Maniglia: indica che il pannello si trascina giù */}
            <span aria-hidden="true" className="ml-3 h-1 w-10 bg-line-soft sm:invisible" />
            <button
              type="button"
              onClick={close}
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
