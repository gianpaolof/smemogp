import { connection } from "next/server";
import { Suspense } from "react";
import { getEvents } from "@/data/events";
import { parseFilters } from "@/domain/filters";
import type { Filters } from "@/domain/types";
import { presentBottomBar, presentHeader, presentMap } from "@/presenters";
import { BottomBar } from "@/ui/nowy/BottomBar";
import { Header } from "@/ui/nowy/Header";
import { MapScreen } from "@/ui/nowy/MapScreen";
import { buildQuery, type SearchParams } from "./query";

async function load(f: Filters, selectedId: string | null) {
  await connection();
  const now = new Date();
  const { query, from } = buildQuery(f, now);
  const events = await getEvents(query);
  return presentMap(events, f, from, now, { lat: query.lat, lng: query.lng }, selectedId);
}

async function Count({ f }: { f: Filters }) {
  return (await load(f, null)).countLabel;
}

async function MapData({ f, selectedId }: { f: Filters; selectedId: string | null }) {
  return <MapScreen vm={await load(f, selectedId)} />;
}

export async function MapRoute({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const f = parseFilters(params);
  const selectedId = typeof params.evento === "string" ? params.evento : null;
  return (
    <>
      <Header vm={presentHeader(f, "mappa")} count={<Suspense fallback="…"><Count f={f} /></Suspense>} />
      <main className="flex min-h-0 flex-1 flex-col">
        <Suspense fallback={<div className="flex-1 animate-pulse bg-line-soft" />}>
          <MapData f={f} selectedId={selectedId} />
        </Suspense>
      </main>
      <BottomBar vm={presentBottomBar(f, "mappa")} />
    </>
  );
}
