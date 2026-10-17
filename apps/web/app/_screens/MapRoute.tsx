import { connection } from "next/server";
import { Suspense } from "react";
import { parseFilters } from "@/domain/filters";
import type { Filters } from "@/domain/types";
import { presentBottomBar, presentHeader, presentMap } from "@/presenters";
import { BottomBar } from "@/ui/nowy/BottomBar";
import { Header } from "@/ui/nowy/Header";
import { MapScreen } from "@/ui/nowy/MapScreen";
import { RestoreFilters } from "@/ui/nowy/RestoreFilters";
import { MapSkeleton } from "@/ui/nowy/Skeletons";
import { serializeFilters } from "@/domain/filters";
import type { SearchParams } from "./query";
import { loadEvents, buildQueryWithBounds } from "./_helpers";

async function load(f: Filters, selectedId: string | null) {
  await connection();
  const now = new Date();
  const { events, from } = await loadEvents(f, now);
  const { query } = buildQueryWithBounds(f, now);
  return presentMap(events, f, from, now, { lat: query.lat, lng: query.lng }, selectedId);
}

async function Count({ f }: { f: Filters }) {
  return (await load(f, null)).countLabel;
}

async function MapData({ f, selectedId }: { f: Filters; selectedId: string | null }) {
  // Key: un nuovo ?evento= (navigazione, non il replaceState dei tap) riparte con selezione e avviso puliti
  return <MapScreen key={selectedId ?? ""} vm={await load(f, selectedId)} />;
}

export async function MapRoute({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const f = parseFilters(params);
  const selectedId = typeof params.evento === "string" ? params.evento : null;
  // Il pannello filtri limita le date a partire da oggi: dato di richiesta
  await connection();
  const now = new Date();
  return (
    <>
      <Header vm={presentHeader(f, "mappa")} count={<Suspense fallback="…"><Count f={f} /></Suspense>} />
      <main className="flex min-h-0 flex-1 flex-col">
        <Suspense fallback={<MapSkeleton />}>
          <MapData f={f} selectedId={selectedId} />
        </Suspense>
      </main>
      <BottomBar vm={presentBottomBar(f, "mappa", now)} count={<Suspense fallback="gli eventi"><Count f={f} /></Suspense>} />
      <RestoreFilters path="/mappa" query={serializeFilters(f)} />
    </>
  );
}
