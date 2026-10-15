import type { NextRequest } from "next/server";
import { parseFilters } from "@/domain/filters";
import { loadEvents } from "../../_screens/_helpers";

/** GET /api/events?periodo=…&raggio=…&cat=…&dal=…&al=…&solo=…&lat=…&lng= → JSON eventi filtrati. */
export async function GET(request: NextRequest) {
  const f = parseFilters(request.nextUrl.searchParams);
  const now = new Date();
  const { events } = await loadEvents(f, now);
  return Response.json({ events });
}
