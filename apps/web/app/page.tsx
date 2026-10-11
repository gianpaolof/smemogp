import { Suspense } from "react";
import { AgendaSkeleton, HeaderSkeleton } from "@/ui/nowy/Skeletons";
import { ListScreen } from "./_screens/ListScreen";
import { Screen } from "./_screens/Screen";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <Screen>
      {/* Shell statica (PPR): lo scheletro arriva subito, il resto in streaming */}
      <Suspense
        fallback={
          <>
            <HeaderSkeleton />
            <AgendaSkeleton />
          </>
        }
      >
        <ListScreen searchParams={searchParams} />
      </Suspense>
    </Screen>
  );
}
