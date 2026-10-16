// Ripristino fedele di eventi cancellati dalle esclusioni: righe identiche (id, campi, provenienze),
// senza riapplicare esclusioni né dedup. Di default simula; --apply scrive.
//   --file <pruned-*.json>   dump scritto da scout:prune-excluded --apply
//   --id <n>                 riga di deleted_events (anche le cancellazioni fatte da persist)
import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { eq, inArray } from "drizzle-orm";
import { createDb, deletedEvents, events, type ArchivedEvent } from "@smemogp/db";
import { restoreArchived } from "./lib/archive";
import { revalidateSite } from "./lib/site";

const { values: args } = parseArgs({
  options: { file: { type: "string" }, id: { type: "string" }, apply: { type: "boolean", default: false } },
});

async function main() {
  if (!args.file === !args.id) throw new Error("Uso: npm run scout:restore -- (--file <pruned-*.json> | --id <n>) [--apply]");
  const db = createDb();

  let items: ArchivedEvent[];
  if (args.file) {
    // npm -w cambia cwd in apps/scout: i percorsi relativi sono rispetto a dove è stato lanciato npm
    items = JSON.parse(await readFile(resolve(process.env.INIT_CWD ?? process.cwd(), args.file), "utf8"));
  } else {
    const row = await db.select().from(deletedEvents).where(eq(deletedEvents.id, Number(args.id))).get();
    if (!row) throw new Error(`deleted_events #${args.id} non trovato`);
    items = [row.payload];
  }
  if (!items.every((a) => a?.event?.id && Array.isArray(a.sources))) throw new Error("Formato non valido: servono { event, sources }");

  // Se nel frattempo lo stesso id è tornato (es. riaggiunto dallo scout), non si sovrascrive
  const ids = items.map((a) => a.event.id);
  const present = new Set((await db.select({ id: events.id }).from(events).where(inArray(events.id, ids)).all()).map((r) => r.id));

  let restored = 0;
  for (const a of items) {
    const label = `«${a.event.title.slice(0, 70)}» (${a.sources.length} provenienze)`;
    if (present.has(a.event.id)) {
      console.log(`  già presente, saltato: ${label}`);
      continue;
    }
    if (args.apply) await restoreArchived(db, a);
    restored++;
    console.log(`  ${args.apply ? "ripristinato" : "da ripristinare"}: ${label}`);
  }
  console.log(`\n${restored} ${args.apply ? "ripristinati" : "da ripristinare (simulazione: --apply per scrivere)"}, ${present.size} già presenti`);
  if (args.apply && restored) await revalidateSite();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
