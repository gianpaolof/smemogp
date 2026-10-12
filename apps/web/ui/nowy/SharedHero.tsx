"use client";

import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";
import { HERO_SHARE } from "@/ui/heroNames";

/** Id dell'evento aperto nel pannello (`/evento/<id>`), se c'è. */
function useOpenEventId() {
  const match = usePathname().match(/^\/evento\/([^/]+)$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/**
 * Lato lista dell'elemento condiviso. Finché uno dei suoi eventi è aperto, la riga rinuncia
 * al nome: per React la sua `<ViewTransition>` esce mentre quella del pannello entra, e
 * l'elemento vola dalla riga al pannello. Alla chiusura succede il contrario.
 */
export function SharedHero({ name, ids, children }: { name: string; ids: string[]; children: ReactNode }) {
  const open = useOpenEventId();
  if (open && ids.includes(open)) return children;
  return (
    <ViewTransition name={name} share={HERO_SHARE} default="none">
      {children}
    </ViewTransition>
  );
}
