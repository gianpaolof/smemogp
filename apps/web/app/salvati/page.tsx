import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getEvent } from "@/data/events";
import { presentSaved } from "@/presenters";
import { Agenda } from "@/ui/nowy/Agenda";
import { Icon } from "@/ui/nowy/icons";
import { SavedSync } from "@/ui/nowy/SavedSync";
import { AgendaSkeleton } from "@/ui/nowy/Skeletons";
import { Screen } from "../_screens/Screen";

export const metadata: Metadata = { title: "Salvati · Eventi Torino" };

async function SavedList({ searchParams }: { searchParams: PageProps<"/salvati">["searchParams"] }) {
  const sp = await searchParams;
  const raw = typeof sp.ids === "string" ? sp.ids : "";
  // Solo id plausibili (sha1 esadecimale), massimo 60: l'input arriva dall'URL
  const ids = [...new Set(raw.split(","))].filter((id) => /^[0-9a-f]{40}$/.test(id)).slice(0, 60);
  await connection();
  const events = (await Promise.all(ids.map((id) => getEvent(id, null)))).filter((e) => e !== null);
  const now = new Date();
  return (
    <>
      <SavedSync current={raw} />
      <Agenda vm={presentSaved(events, now)} />
    </>
  );
}

export default function SavedPage({ searchParams }: PageProps<"/salvati">) {
  return (
    <Screen>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg pt-[env(safe-area-inset-top)] [view-transition-name:app-header]">
        <h1 className="display-title px-3 py-2 text-3xl">Salvati</h1>
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
