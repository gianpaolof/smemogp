import { Suspense } from "react";
import { AgendaSkeleton, HeaderSkeleton } from "@/ui/nowy/Skeletons";
import { DesktopMapLoader } from "./_screens/DesktopMapLoader";
import { ListScreen } from "./_screens/ListScreen";
import { Screen } from "./_screens/Screen";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <Screen
      aside={
        <Suspense fallback={<div className="hatch h-full w-full" />}>
          <DesktopMapLoader searchParams={searchParams} />
        </Suspense>
      }
    >
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
