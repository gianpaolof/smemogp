"use client";

import { useState } from "react";
import { toggleSaved, useSaved } from "@/hooks/useSaved";
import { haptic } from "@/hooks/useMotion";
import { Icon } from "./icons";

const cell = "press flex h-12 items-center justify-center gap-1.5 border-r border-line text-xs font-semibold last:border-r-0 hover:bg-line-soft";

/** Salva (in questo browser), aggiungi al calendario, condividi. */
export function EventActions({ id, title, shareText, icsHref }: { id: string; title: string; shareText: string; icsHref: string }) {
  const saved = useSaved().includes(id);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    // Il link canonico è la pagina dell'evento, senza filtri
    const url = `${location.origin}/evento/${encodeURIComponent(id)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: shareText, url });
        return;
      }
      await navigator.clipboard.writeText(`${shareText}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Condivisione annullata dall'utente: niente da fare
    }
  };

  return (
    <div className="grid grid-cols-3 border-b border-line">
      <button
        type="button"
        aria-pressed={saved}
        onClick={() => {
          toggleSaved(id);
          haptic();
        }}
        className={`${cell} ${saved ? "bg-accent text-accent-fg hover:bg-accent" : ""}`}
      >
        <Icon name="star" filled={saved} />
        {saved ? "Salvato" : "Salva"}
      </button>
      <a href={icsHref} download className={cell}>
        <Icon name="calendar" />
        Calendario
      </a>
      <button type="button" onClick={share} className={cell}>
        <Icon name="share" />
        <span aria-live="polite">{copied ? "Link copiato" : "Condividi"}</span>
      </button>
    </div>
  );
}
