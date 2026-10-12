"use client";

import { useState } from "react";
import { toggleSaved, useIsSaved } from "@/hooks/useSaved";
import { haptic } from "@/hooks/useMotion";
import type { SaveVM } from "@/ui/contracts";
import { Icon } from "./icons";

/**
 * ★ in un tocco, accanto al link della riga o della card (fratello, mai dentro).
 * `data-state` "unknown" finché il browser non ha letto lo storage: niente attenuazione al primo paint.
 */
export function SaveToggle({ entry, onAccent = false, className = "" }: { entry: SaveVM; onAccent?: boolean; className?: string }) {
  const saved = useIsSaved(entry.id);
  // Il «pop» solo al passaggio a salvato, non al caricamento
  const [pop, setPop] = useState(false);

  const color = saved ? (onAccent ? "text-accent-fg" : "text-accent") : onAccent ? "text-accent-fg/55" : "text-muted";

  return (
    <button
      type="button"
      data-state={saved === null ? "unknown" : String(saved)}
      aria-pressed={saved === true}
      aria-label={`Salva «${entry.title}»`}
      title={saved ? "Togli dai salvati" : "Salva"}
      onClick={() => {
        const now = toggleSaved(entry);
        setPop(now);
        haptic();
      }}
      className={`press flex touch-manipulation items-center justify-center text-base ${color} ${className}`}
    >
      <Icon name="star" filled={saved === true} className={pop ? "star-pop" : undefined} onAnimationEnd={() => setPop(false)} />
    </button>
  );
}
