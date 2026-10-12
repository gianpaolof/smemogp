import type { Metadata } from "next";
import { Suspense } from "react";
import { HeaderSkeleton, MapSkeleton } from "@/ui/nowy/Skeletons";
import { MapRoute } from "../_screens/MapRoute";
import { Screen } from "../_screens/Screen";

export const metadata: Metadata = { title: "Mappa · Eventi Torino" };

export default function MapPage({ searchParams }: PageProps<"/mappa">) {
  return (
    <Screen wide>
      <Suspense
        fallback={
          <>
            <HeaderSkeleton />
            <MapSkeleton />
          </>
        }
      >
        <MapRoute searchParams={searchParams} />
      </Suspense>
    </Screen>
  );
}
