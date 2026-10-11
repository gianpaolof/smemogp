import { notFound } from "next/navigation";
import { getEvent } from "@/data/events";
import { parseFilters } from "@/domain/filters";
import { presentDetail } from "@/presenters";
import { EventDetail } from "@/ui/nowy/EventDetail";
import type { SearchParams } from "./query";

export async function DetailContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const f = parseFilters(sp);
  const event = await getEvent(decodeURIComponent(id), f.origin);
  if (!event) notFound();
  return <EventDetail vm={presentDetail(event, f)} />;
}
