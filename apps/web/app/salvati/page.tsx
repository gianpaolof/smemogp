import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { cache, Suspense } from "react";
import { getEventsByIds } from "@/data/events";
import { endOf } from "@/domain/agenda";
import { isEventId, MAX_URL_IDS, type SavedEntry } from "@/domain/saved";
import { presentSaved } from "@/presenters";
import { Agenda, PastGroup } from "@/ui/nowy/Agenda";
import { Icon } from "@/ui/nowy/icons";
import { SavedOrphans } from "@/ui/nowy/SavedOrphans";
import { SavedSync } from "@/ui/nowy/SavedSync";
import { AgendaSkeleton } from "@/ui/nowy/Skeletons";
import { Screen } from "../_screens/Screen";

export const metadata: Metadata = { title: "Salvati · Eventi Torino" };

type SearchParams = PageProps<"/salvati">["searchParams"];

/** Solo id plausibili (sha1 esadecimale), senza doppioni, al massimo MAX_URL_IDS: l'input arriva dall'URL. */
function parseIds(raw: string) {
  const ids = [...new Set(raw.split(",").filter(isEventId))].slice(0, MAX_URL_IDS);
  // Ordinati: lo stesso insieme dà la stessa chiave di cache
  return ids.sort();
}

/**
 * Una sola lettura per richiesta, condivisa da intestazione e lista (React `cache`, chiave
 * primitiva): i due rami stanno in Suspense diversi ma non duplicano la query.
 */
const loadSaved = cache(async (raw: string) => {
  const ids = parseIds(raw);
  await connection();
  const { events, foundIds } = await getEventsByIds(ids);
  const found = new Set(foundIds);
  const missingIds = ids.filter((id) => !found.has(id));
  return { ids, events, vm: presentSaved(events, missingIds, new Date()) };
});

async function rawIds(searchParams: SearchParams) {
  const sp = await searchParams;
  return typeof sp.ids === "string" ? sp.ids : "";
}

async function SavedCount({ searchParams }: { searchParams: SearchParams }) {
  const { vm } = await loadSaved(await rawIds(searchParams));
  // Solo se c'è almeno un evento prossimo o in corso
  if (!vm.upcoming.days.length) return null;
  return <p className="px-3 pb-2 text-xs font-semibold text-muted">{vm.countLabel}</p>;
}

async function SavedList({ searchParams }: { searchParams: SearchParams }) {
  const { ids, events, vm } = await loadSaved(await rawIds(searchParams));
  // Snapshot freschi per lo store: titolo e fine aggiornati dal catalogo
  const found: SavedEntry[] = events.map((e) => ({ id: e.id, title: e.title, until: endOf(e).toISOString() }));
  return (
    <>
      <SavedSync current={ids} found={found} />
      <Agenda vm={vm.upcoming} dimUnsaved />
      <PastGroup group={vm.past} />
      <SavedOrphans ids={vm.missingIds} />
    </>
  );
}

export default function SavedPage({ searchParams }: PageProps<"/salvati">) {
  return (
    <Screen>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg pt-[env(safe-area-inset-top)] [view-transition-name:app-header]">
        <div>
          <h1 className="display-title px-3 py-2 text-3xl">Salvati</h1>
          <Suspense fallback={null}>
            <SavedCount searchParams={searchParams} />
          </Suspense>
        </div>
        <Link
          href="/"
          transitionTypes={["nav-back"]}
          className="press flex h-12 items-center gap-1.5 border-l border-line px-4 text-xs font-semibold hover:bg-line-soft"
        >
          <Icon name="left" />
          Eventi
        </Link>
      </header>
      <main className="flex-1">
        <Suspense fallback={<AgendaSkeleton />}>
          <SavedList searchParams={searchParams} />
        </Suspense>
      </main>
    </Screen>
  );
}
