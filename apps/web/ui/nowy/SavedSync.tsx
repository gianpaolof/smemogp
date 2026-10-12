"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { idsForUrl, MAX_URL_IDS, type SavedEntry } from "@/domain/saved";
import { syncSaved, useSavedEntries } from "@/hooks/useSaved";

/**
 * I salvati stanno nel browser: l'URL porta gli id al server, che li rende.
 * Si ricarica solo se nello storage c'è un id che la pagina non ha (salvato in un'altra scheda,
 * o primo arrivo senza `?ids=`): le rimozioni no, la riga resta attenuata e ri-toccabile.
 */
export function SavedSync({ current, found }: { current: string[]; found: readonly SavedEntry[] }) {
  const router = useRouter();
  const entries = useSavedEntries();
  const requested = useRef<string | null>(null);

  // Snapshot freschi dal server (titolo, fine) + potatura dei passati vecchi; scrive solo se cambia
  useEffect(() => {
    syncSaved(found);
  }, [found]);

  useEffect(() => {
    const stored = idsForUrl(entries);
    const have = new Set(current);
    if (!stored.some((id) => !have.has(id))) return;
    // Si tengono anche le righe della pagina tolte qui (attenuate, ri-toccabili): spariscono al
    // prossimo caricamento pulito, non a metà gesto per un salvataggio in un'altra scheda
    const ids = [...new Set([...stored, ...current])].slice(0, MAX_URL_IDS);
    // Virgole valide nella query: niente encodeURIComponent (eviterebbe %2C ×150)
    const url = `/salvati?ids=${ids.join(",")}`;
    if (requested.current === url) return;
    requested.current = url;
    router.replace(url, { scroll: false });
  }, [entries, current, router]);

  return null;
}
