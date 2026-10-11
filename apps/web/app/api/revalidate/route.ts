import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { EVENTS_TAG } from "@/data/events";

/** Chiamato dallo scout a fine run: `Authorization: Bearer $REVALIDATE_SECRET`. */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const ok =
    !!secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return Response.json({ revalidated: false }, { status: 401 });

  // stale-while-revalidate: chi arriva adesso vede ancora i vecchi dati, poi i nuovi
  revalidateTag(EVENTS_TAG, "max");
  return Response.json({ revalidated: true, now: Date.now() });
}
