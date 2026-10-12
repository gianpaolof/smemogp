"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Lato server e prima dell'idratazione è false: il layout mobile è sempre quello di partenza. */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

/** Da qui in su la lista e la mappa stanno affiancate (Tailwind `lg`). */
export const DESKTOP_QUERY = "(min-width: 1024px)";
