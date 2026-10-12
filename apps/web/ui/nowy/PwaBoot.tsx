"use client";

import { useEffect } from "react";
import { useOffline } from "next/offline";

/** Registra il service worker (solo in produzione) e avvisa quando manca la rete. */
export function PwaBoot() {
  const offline = useOffline();
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  if (!offline) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-line bg-fg px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center text-xs font-semibold text-bg"
    >
      Sei offline. Riprovo appena torna la rete.
    </div>
  );
}
