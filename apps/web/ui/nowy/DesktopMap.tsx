"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery";
import type { MapVM } from "@/ui/contracts";

/** Il pannello dettaglio copre il lato destro della mappa (DetailPanel, `lg:w-[440px]`). */
const DETAIL_PANEL_PX = 440;

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="hatch h-full w-full" />,
});

/**
 * Mappa fissa accanto alla lista (solo desktop). Su mobile non monta nulla: Leaflet non si scarica.
 * L'evento selezionato è quello aperto nel pannello (`/evento/[id]`), quindi lista, mappa e URL restano allineati.
 */
export function DesktopMap({ vm }: { vm: MapVM }) {
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const pathname = usePathname();
  const router = useRouter();
  if (!desktop) return null;

  const selectedId = pathname.startsWith("/evento/") ? decodeURIComponent(pathname.slice("/evento/".length)) : null;
  const open = (id: string) => {
    const row = vm.rows.find((r) => r.id === id);
    if (!row) return;
    // Già su un evento: sostituisce, così Indietro chiude il pannello invece di scorrere gli eventi visti
    if (selectedId) router.replace(row.href, { scroll: false });
    else router.push(row.href, { scroll: false });
  };

  return (
    <LeafletMap
      vm={vm}
      selectedId={selectedId}
      focusSelected={selectedId !== null}
      onSelect={open}
      fitKey={0}
      coverRight={selectedId ? DETAIL_PANEL_PX : 0}
    />
  );
}
