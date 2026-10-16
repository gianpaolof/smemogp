// Ingest di eventi raccolti fuori dallo scout (skill /scout-eventi): stessa pipeline di persistenza.
import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { CATEGORIES, createDb } from "@smemogp/db";
import { persistEvents } from "./lib/persist";
import { revalidateSite } from "./lib/site";
import { readCatalog } from "./lib/sources";
import type { RawEvent } from "./types";

const { values: args } = parseArgs({
  options: {
    file: { type: "string" },
    source: { type: "string" }, // sovrascrive "source" del file
    "dry-run": { type: "boolean", default: false },
  },
});

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/, "ISO 8601: data, o data+ora con offset")
  .refine((s) => !Number.isNaN(new Date(s).getTime()), "data non valida");

const httpsUrl = z
  .string()
  .max(2000)
  .refine((s) => {
    try {
      return new URL(s).protocol === "https:";
    } catch {
      return false;
    }
  }, "serve un URL https");

const text = (max: number) => z.string().trim().max(max).nullish();

const IngestEvent = z.object({
  title: z.string().trim().min(2).max(300),
  startsAt: isoDate,
  endsAt: isoDate.nullish(),
  allDay: z.boolean().nullish(),
  description: text(4000),
  venueName: text(200),
  address: text(300),
  city: text(100),
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
  category: z.enum(CATEGORIES).nullish(),
  priceText: text(100),
  imageUrl: httpsUrl.nullish(),
  url: httpsUrl,
});

const IngestFile = z.object({
  source: z.string().regex(/^(skill:)?[a-z0-9-]+$/),
  events: z.array(z.unknown()).max(500),
});

/** Data senza ora = tutto il giorno, alle 12 di Roma per non cambiare giorno con l'offset. */
function toDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00+01:00`) : new Date(s);
}

async function main() {
  if (!args.file) throw new Error("Uso: npm run scout:ingest -- --file <eventi.json> [--source <id>] [--dry-run]");
  // npm -w cambia cwd in apps/scout: i percorsi relativi sono rispetto a dove è stato lanciato npm
  const path = resolve(process.env.INIT_CWD ?? process.cwd(), args.file);
  const file = IngestFile.parse(JSON.parse(await readFile(path, "utf8")));
  const sourceId = args.source ?? file.source;

  const catalog = await readCatalog();
  const known = catalog.find((s) => s.id === sourceId);
  if (!known && !sourceId.startsWith("skill:")) throw new Error(`Fonte "${sourceId}" non nel catalogo (usa skill:<modo>)`);

  // Un evento invalido non blocca gli altri: lo si scarta e lo si riporta
  const raw: RawEvent[] = [];
  let rejected = 0;
  file.events.forEach((item, i) => {
    const parsed = IngestEvent.safeParse(item);
    if (!parsed.success) {
      rejected++;
      console.warn(`  scartato #${i}: ${parsed.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`);
      return;
    }
    const e = parsed.data;
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(e.startsAt);
    raw.push({
      ...e,
      startsAt: toDate(e.startsAt),
      endsAt: e.endsAt ? toDate(e.endsAt) : null,
      allDay: e.allDay ?? dateOnly,
      category: e.category ?? undefined,
    });
  });

  const db = createDb();
  const { stats } = await persistEvents(db, { id: sourceId, category: known?.category }, raw, {
    dryRun: args["dry-run"],
  });
  console.log(
    `Ingest ${sourceId}${args["dry-run"] ? " (dry-run)" : ""}: salvati ${stats.saved}, fusi ${stats.merged}, esclusi ${stats.excluded}, già salvati da escludere ${stats.stale}, passati ${stats.past}, scartati ${rejected}`,
  );
  if (!args["dry-run"] && stats.saved) await revalidateSite();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
