import { Suspense } from "react";
import { DetailPanel } from "@/ui/nowy/DetailPanel";
import { AgendaSkeleton } from "@/ui/nowy/Skeletons";
import { DetailContent } from "../../../_screens/DetailContent";

/** `/evento/[id]` intercettato: pannello sopra la vista corrente, URL condivisibile. */
export default function EventPanel({ params, searchParams }: PageProps<"/evento/[id]">) {
  return (
    <DetailPanel>
      <Suspense fallback={<AgendaSkeleton />}>
        <DetailContent params={params} searchParams={searchParams} />
      </Suspense>
    </DetailPanel>
  );
}
