import type { ViewTransitionClass } from "react";

/**
 * Nomi condivisi tra riga della lista e pannello dettaglio: React anima l'elemento
 * dalla riga al pannello (e ritorno) quando uno esce e l'altro entra nello stesso commit.
 * Il nome diventa `view-transition-name`, quindi solo caratteri validi in un identificatore CSS.
 */
const ident = (s: string) => s.replace(/[^\w-]/g, "_");

export const heroTitle = (eventId: string) => `t-${ident(eventId)}`;
export const heroDay = (dayKey: string) => `d-${ident(dayKey)}`;

/** Morph solo aprendo/chiudendo un evento: lista↔mappa↔salvati hanno già il loro slide. */
export const HERO_SHARE: ViewTransitionClass = { "nav-forward": "none", "nav-back": "none", default: "hero" };
