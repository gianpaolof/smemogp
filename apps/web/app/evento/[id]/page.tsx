import Link from "next/link";
import { Suspense } from "react";
import { AgendaSkeleton } from "@/ui/nowy/Skeletons";
import { DetailContent } from "../../_screens/DetailContent";

/** Pagina intera: link diretto o refresh. Da lista/mappa si apre invece il pannello (@modal). */
export default function EventPage({ params, searchParams }: PageProps<"/evento/[id]">) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col sm:border-x sm:border-line">
      <nav className="sticky top-0 z-20 flex border-b border-line bg-bg">
        <Link
          href="/"
          transitionTypes={["nav-back"]}
          className="flex h-12 items-center px-3 text-xs font-semibold hover:bg-line-soft"
        >
          ← Tutti gli eventi
        </Link>
      </nav>
      <Suspense fallback={<AgendaSkeleton />}>
        <DetailContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
