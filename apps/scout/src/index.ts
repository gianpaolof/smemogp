import { parseArgs } from "node:util";
import { and, eq, isNull, lt, notExists, or } from "drizzle-orm";
import { createDb, eventSources, events, sourceRuns, type Db } from "@smemogp/db";
import { adapterFor } from "./adapters";
import { followDetails } from "./lib/detail";
import { withDefaultVenue } from "./lib/venue";
import { sha1 } from "./lib/html";
import { fetchText, renderPage } from "./lib/http";
import { persistEvents } from "./lib/persist";
import { revalidateSite } from "./lib/site";
import { loadSources } from "./lib/sources";
import type { FetchedContent, Source } from "./types";

const { values: args } = parseArgs({
  options: {
    only: { type: "string" }, // id fonte singola (anche se non active)
    force: { type: "boolean", default: false }, // ignora hash contenuto invariato
    "dry-run": { type: "boolean", default: false },
  },
});

const MAX_PAGES = 5;

function pageUrl(base: string, page: number) {
  if (page === 1) return base;
  const u = new URL(base);
  u.searchParams.set("page", String(page));
  return u.href;
}

async function fetchPages(source: Source): Promise<FetchedContent[]> {
  const adapter = adapterFor(source);
  if (adapter.fetch) return [await adapter.fetch(source)];
  const base = source.feedUrl ?? source.url;
  const pages: FetchedContent[] = [];
  for (let p = 1; p <= Math.min(source.pages ?? 1, MAX_PAGES); p++) {
    const url = pageUrl(base, p);
    const body = source.format === "js" ? await renderPage(url) : await fetchText(url);
    pages.push({ url, body });
  }
  return pages;
}

async function runSource(db: Db, source: Source) {
  const pages = await fetchPages(source);
  const hash = sha1(pages.map((p) => p.body).join("\n"));
  const prev = await db.select().from(sourceRuns).where(eq(sourceRuns.sourceId, source.id)).get();

  if (!args.force && prev?.contentHash === hash) {
    await db.update(sourceRuns).set({ lastRunAt: new Date(), lastStatus: "unchanged" }).where(eq(sourceRuns.sourceId, source.id));
    return { status: "unchanged" as const, count: 0 };
  }

  const adapter = adapterFor(source);
  let raw = (await Promise.all(pages.map((p) => adapter.extract(source, p)))).flat();
  if (source.detail) raw = await followDetails(source, pages, raw);
  if (source.defaultVenue) raw = raw.map((e) => withDefaultVenue(e, source.defaultVenue!));

  const { rows, stats } = await persistEvents(db, source, raw, { dryRun: args["dry-run"] });
  console.log(`  ${source.id}: salvati ${stats.saved}, fusi ${stats.merged}, esclusi ${stats.excluded}, passati ${stats.past}`);

  if (args["dry-run"]) {
    console.table(
      rows.map((r) => ({ title: r.title.slice(0, 50), startsAt: r.startsAt, allDay: r.allDay, city: r.city, lat: r.lat })),
    );
    return { status: "ok" as const, count: rows.length };
  }

  const run = { lastRunAt: new Date(), lastStatus: "ok" as const, lastError: null, contentHash: hash, eventsFound: rows.length };
  await db
    .insert(sourceRuns)
    .values({ sourceId: source.id, ...run })
    .onConflictDoUpdate({ target: sourceRuns.sourceId, set: run });

  return { status: "ok" as const, count: rows.length };
}

async function pruneOldEvents(db: Db) {
  const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  await db
    .delete(events)
    .where(or(lt(events.endsAt, cutoff), and(isNull(events.endsAt), lt(events.startsAt, cutoff))));
  // Provenienze orfane (se le FK non sono attive sul client)
  await db
    .delete(eventSources)
    .where(notExists(db.select().from(events).where(eq(events.id, eventSources.eventId))));
}

async function main() {
  const db = createDb();
  const sources = await loadSources(args.only);
  console.log(`Scout: ${sources.length} fonti`);

  let failures = 0;
  for (const source of sources) {
    const t0 = Date.now();
    try {
      const { status, count } = await runSource(db, source);
      console.log(`✓ ${source.id}: ${status}, ${count} eventi (${Date.now() - t0}ms)`);
    } catch (err) {
      failures++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`✗ ${source.id}: ${message}`);
      if (!args["dry-run"]) {
        const run = { lastRunAt: new Date(), lastStatus: "error" as const, lastError: message };
        await db.insert(sourceRuns).values({ sourceId: source.id, ...run }).onConflictDoUpdate({ target: sourceRuns.sourceId, set: run });
      }
    }
  }

  if (!args["dry-run"] && !args.only) await pruneOldEvents(db);
  if (!args["dry-run"]) await revalidateSite();
  // Fallisce il job solo se tutte le fonti falliscono
  if (sources.length && failures === sources.length) process.exit(1);
}

main();
