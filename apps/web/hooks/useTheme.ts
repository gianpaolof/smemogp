"use client";

import { useSyncExternalStore } from "react";

export type ThemeChoice = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "tema";

/** Sfondo per tema (= --bg in globals.css): colora la barra del browser e lo splash. */
export const BG = { light: "#ffffff", dark: "#0d0d0d" } as const;

/**
 * Eseguito inline nel <head> prima del primo paint: evita il lampo di tema sbagliato.
 * Tenere in sync con `resolve()` qui sotto.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var c=localStorage.getItem("${THEME_STORAGE_KEY}");var d=c==="dark"||(c!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";var t=function(){document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.removeAttribute("media");m.content=d?"${BG.dark}":"${BG.light}"})};t();document.addEventListener("DOMContentLoaded",t)}catch(e){}})()`;

const media = () => window.matchMedia("(prefers-color-scheme: dark)");

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function resolve(choice: ThemeChoice): ResolvedTheme {
  if (choice === "system") return media().matches ? "dark" : "light";
  return choice;
}

function apply(choice: ThemeChoice) {
  const theme = resolve(choice);
  document.documentElement.dataset.theme = theme;
  // La barra di stato segue il tema scelto nell'app, non solo quello di sistema
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.removeAttribute("media");
    m.content = BG[theme];
  });
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = media();
  const onSystem = () => {
    if (readChoice() === "system") apply("system");
    notify();
  };
  mq.addEventListener("change", onSystem);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener("change", onSystem);
  };
}

/** Tema risolto, letto dall'attributo su <html> (impostato dallo script inline). */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
    () => "light",
  );
}

export function useTheme() {
  const choice = useSyncExternalStore(subscribe, readChoice, () => "system" as ThemeChoice);
  const resolved = useResolvedTheme();

  const setChoice = (next: ThemeChoice) => {
    const commit = () => {
      try {
        if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
        else localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // storage bloccato: il tema vale solo per questa pagina
      }
      apply(next);
      notify();
    };
    // Cambio tema animato dove il browser supporta le View Transitions
    if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.dataset.themeSwitch = "";
      const t = document.startViewTransition(commit);
      // Animazione saltata (es. tab nascosta): il tema è comunque applicato da commit
      t.ready.catch(() => {});
      t.finished.finally(() => {
        delete document.documentElement.dataset.themeSwitch;
      });
    } else {
      commit();
    }
  };

  const order: ThemeChoice[] = ["system", "light", "dark"];
  const cycle = () => setChoice(order[(order.indexOf(choice) + 1) % order.length]);

  return { choice, resolved, setChoice, cycle };
}
