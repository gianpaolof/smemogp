import { connection } from "next/server";
import { getEvents } from "@/data/events";
import { parseFilters } from "@/domain/filters";
import { presentMap } from "@/presenters";
import { DesktopMap } from "@/ui/nowy/DesktopMap";
import { buildQuery, type SearchParams } from "./query";

/** Stessi eventi della lista (query in cache): la mappa a fianco non costa una richiesta in più. */
export async function DesktopMapLoader({ searchParams }: { searchParams: SearchParams }) {
  const f = parseFilters(await searchParams);
  await connection();
  const now = new Date();
  const { query, from } = buildQuery(f, now);
  const vm = presentMap(await getEvents(query), f, from, now, { lat: query.lat, lng: query.lng }, null);
  return <DesktopMap vm={vm} />;
}
