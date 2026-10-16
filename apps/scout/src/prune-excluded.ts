// Applica exclude.json agli eventi futuri già nel DB. Di default simula; con --apply
// salva prima il dump JSON in docs/research/, poi archivia in deleted_events e cancella.
import { parseArgs } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { createDb, events } from "@smemogp/db";
import { archiveAndDelete, snapshot } from "./lib/archive";
import { exclusionReason } from "./lib/exclude";
import { startOfTodayRome } from "./lib/persist";
import { revalidateSite } from "./lib/site";

const { values: args } = parseArgs({ options: { apply: { type: "boolean", default: false } } });

async function main() {
  const db = createDb();
  const rows = await db
    .select({ id: events.id, title: events.title, description: events.description, venueName: events.venueName, startsAt: events.startsAt })
    .from(events)
    // Colonne in secondi Unix: senza mappatura di colonna la Date va convertita a mano
    .where(sql`coalesce(${events.endsAt}, ${events.startsAt}) >= ${Math.floor(startOfTodayRome().getTime() / 1000)}`)
    .all();

  const hits = rows.flatMap((e) => {
    const reason = exclusionReason(e);
    return reason ? [{ ...e, reason }] : [];
  });
  for (const h of hits) console.log(`${h.startsAt.toISOString().slice(0, 10)}  «${h.title.slice(0, 70)}»  (${h.reason.slice(0, 80)})`);
  console.log(`\n${hits.length} da rimuovere su ${rows.length} eventi futuri${args.apply ? "" : " (simulazione: --apply per cancellare)"}`);
  if (!args.apply || !hits.length) return;

  // Backup su file prima di toccare il DB: se la scrittura fallisce, si esce senza cancellare.
  // Formato: ArchivedEvent + motivo; si ripristina con restoreArchived (non con scout:ingest).
  const dir = new URL("../../../docs/research/", import.meta.url);
  await mkdir(dir, { recursive: true });
  const file = new URL(`pruned-${new Date().toISOString().replace(/[:.]/g, "-")}.json`, dir);
  const backup = await snapshot(db, hits.map((h) => h.id));
  const reasons = new Map(hits.map((h) => [h.id, h.reason]));
  await writeFile(file, JSON.stringify(backup.map((a) => ({ reason: reasons.get(a.event.id), ...a })), null, 2));
  console.log(`Backup: ${file.pathname}`);

  const removed = await archiveAndDelete(db, hits);
  console.log(`Rimossi ${removed.length} eventi (archiviati in deleted_events)`);
  await revalidateSite();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
