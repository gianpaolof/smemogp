import type { NextRequest } from "next/server";
import { getEvents } from "@/data/events";
import { parseFilters } from "@/domain/filters";
import { buildQuery } from "../../_screens/query";

/** Stessi parametri dell'URL dell'app: ?periodo=&raggio=&cat=&lat=&lng= */
export async function GET(request: NextRequest) {
  const f = parseFilters(request.nextUrl.searchParams);
  const { query } = buildQuery(f, new Date());
  const events = await getEvents(query);
  return Response.json({ events });
}
