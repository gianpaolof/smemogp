import { connection } from "next/server";
import { Suspense, ViewTransition } from "react";
import { parseFilters } from "@/domain/filters";
import type { Filters } from "@/domain/types";
import { presentAgenda, presentBottomBar, presentHeader } from "@/presenters";
import { Agenda } from "@/ui/nowy/Agenda";
import { BottomBar } from "@/ui/nowy/BottomBar";
import { Colophon } from "@/ui/nowy/Colophon";
import { Header } from "@/ui/nowy/Header";
import { RestoreFilters } from "@/ui/nowy/RestoreFilters";
import { AgendaSkeleton } from "@/ui/nowy/Skeletons";
import { serializeFilters } from "@/domain/filters";
import type { SearchParams } from "./query";
import { loadEvents } from "./_helpers";

async function loadAgenda(f: Filters) {
  // "Adesso" è un dato di richiesta: fuori dalla shell prerenderizzata
  await connection();
  const now = new Date();
  const { events, from } = await loadEvents(f, now);
  return presentAgenda(events, f, from, now);
}

async function Count({ f }: { f: Filters }) {
  return (await loadAgenda(f)).countLabel;
}

async function AgendaData({ f }: { f: Filters }) {
  const vm = await loadAgenda(f);
  return (
    <ViewTransition enter="reveal" default="none">
      <Agenda vm={vm} />
    </ViewTransition>
  );
}

export async function ListScreen({ searchParams }: { searchParams: SearchParams }) {
  const f = parseFilters(await searchParams);
  return (
    <>
      <Header vm={presentHeader(f, "lista")} count={<Suspense fallback="…"><Count f={f} /></Suspense>} />
      <main className="flex-1">
        <Suspense
          fallback={
            <ViewTransition exit="reveal-out" default="none">
              <AgendaSkeleton />
            </ViewTransition>
          }
        >
          <AgendaData f={f} />
        </Suspense>
      </main>
      <Colophon />
      <BottomBar vm={presentBottomBar(f, "lista")} count={<Suspense fallback="gli eventi"><Count f={f} /></Suspense>} />
      <RestoreFilters path="/" query={serializeFilters(f)} />
    </>
  );
}
