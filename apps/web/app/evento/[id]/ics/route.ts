import { getEvent } from "@/data/events";
import { safeExternalUrl } from "@/domain/format";
import { toIcs } from "@/domain/ics";

/** «Aggiungi al calendario»: un VEVENT scaricabile, aperto da Calendario/Google/Outlook. */
export async function GET(_req: Request, ctx: RouteContext<"/evento/[id]/ics">) {
  const { id } = await ctx.params;
  const event = await getEvent(decodeURIComponent(id), null);
  if (!event) return new Response("Evento non trovato", { status: 404 });
  const body = toIcs(event, safeExternalUrl(event.url)?.href ?? null, new Date());
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="evento-${event.id.slice(0, 8)}.ics"`,
    },
  });
}
