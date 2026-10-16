import { eq, inArray } from "drizzle-orm";
import { deletedEvents, eventSources, events, type ArchivedEvent, type Db } from "@smemogp/db";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Evento + provenienze così come sono nel DB. */
export async function snapshot(db: Db | Tx, ids: string[]): Promise<ArchivedEvent[]> {
  if (!ids.length) return [];
  const rows = await db.select().from(events).where(inArray(events.id, ids)).all();
  const sources = await db.select().from(eventSources).where(inArray(eventSources.eventId, ids)).all();
  return rows.map((event) => ({ event, sources: sources.filter((s) => s.eventId === event.id) }));
}

/**
 * Archivia in `deleted_events` e poi cancella, nella stessa transazione:
 * se l'archivio fallisce non si cancella nulla.
 */
export async function archiveAndDelete(db: Db, items: { id: string; reason: string }[]): Promise<ArchivedEvent[]> {
  if (!items.length) return [];
  return db.transaction(async (tx) => {
    const archived = await snapshot(tx, items.map((i) => i.id));
    for (const a of archived) {
      const reason = items.find((i) => i.id === a.event.id)!.reason;
      await tx.insert(deletedEvents).values({ eventId: a.event.id, reason, payload: a });
      await tx.delete(eventSources).where(eq(eventSources.eventId, a.event.id));
      await tx.delete(events).where(eq(events.id, a.event.id));
    }
    return archived;
  });
}

// Nel JSON le date diventano stringhe ISO
const date = (v: Date | string | null) => (v == null ? null : new Date(v));

/**
 * Ripristino fedele (righe identiche, senza filtri né dedup), a differenza di `scout:ingest`
 * che riapplica esclusioni e dedup e quindi non garantisce lo stesso id né le stesse provenienze.
 */
export async function restoreArchived(db: Db, a: ArchivedEvent) {
  const e = a.event;
  await db.transaction(async (tx) => {
    await tx.insert(events).values({
      ...e,
      startsAt: date(e.startsAt)!,
      endsAt: date(e.endsAt),
      createdAt: date(e.createdAt)!,
      updatedAt: date(e.updatedAt)!,
    });
    for (const s of a.sources) {
      await tx.insert(eventSources).values({ ...s, firstSeenAt: date(s.firstSeenAt)!, lastSeenAt: date(s.lastSeenAt)! });
    }
  });
}
