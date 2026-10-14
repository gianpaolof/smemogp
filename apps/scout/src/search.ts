// Ricerca web di eventi via OpenRouter: il modello TROVA le pagine, lo scout le scarica e ne legge i dati.
// Nessun evento entra dal testo del modello: stessa regola della skill /scout-eventi (evento visto sulla sua pagina).
import { parseArgs } from "node:util";
import { inArray } from "drizzle-orm";
import { createDb, eventSources, type Db } from "@smemogp/db";
import { llmAdapter } from "./adapters/llm";
import { extractJsonLd } from "./adapters/jsonld";
import { fetchText } from "./lib/http";
import { chatJson, DEFAULT_MODEL, hasApiKey, jsonSchemaFormat, parseJsonLoose, spentUsd } from "./lib/openrouter";
import { persistEvents } from "./lib/persist";
import { Candidates, discoveryMessages, groundCandidates, inWindow, loadTopics, normalizeUrl, type SearchTopic } from "./lib/search";
import { revalidateSite } from "./lib/site";
import type { RawEvent, Source } from "./types";

const { values: args } = parseArgs({
  options: {
    query: { type: "string" }, // id tema singolo (searches.json)
    model: { type: "string" }, // id OpenRouter, sovrascrive SCOUT_SEARCH_MODEL
    engine: { type: "string" }, // exa | parallel | perplexity | native | auto
    days: { type: "string", default: "60" },
    budget: { type: "string" }, // USD per run, sovrascrive SCOUT_SEARCH_MAX_USD
    "dry-run": { type: "boolean", default: false },
  },
});

const MODEL = args.model || process.env.SCOUT_SEARCH_MODEL || DEFAULT_MODEL;
// Motore fisso di default: cambiando modello si confrontano i modelli, non i motori
const ENGINE = args.engine || process.env.SCOUT_SEARCH_ENGINE || "exa";
// `||` e non `??`: le variabili GitHub non impostate arrivano come stringa vuota
const BUDGET = Number(args.budget || process.env.SCOUT_SEARCH_MAX_USD || 0.5);
const PAUSE_MS = 1000;
const FORMAT = jsonSchemaFormat("pagine_evento", Candidates);

const webSearch = {
  type: "openrouter:web_search",
  parameters: { engine: ENGINE, max_results: 8, max_uses: 4, excluded_domains: ["teatroregio.torino.it"] },
};

class BudgetExceeded extends Error {
  /** Eventi già salvati dal tema interrotto: contano per il totale e la revalidate */
  saved = 0;
}
function checkBudget() {
  if (spentUsd() >= BUDGET) throw new BudgetExceeded(`budget di ${BUDGET.toFixed(2)} $ raggiunto`);
}

/** Pagine candidate per un tema (il ripiego senza schema sta in `chatJson`). */
async function discover(topic: SearchTopic, window: { from: Date; to: Date }, max: number) {
  const res = await chatJson({
    model: MODEL,
    messages: discoveryMessages(topic, window, max),
    tools: [webSearch],
    maxToolCalls: 6,
    maxTokens: 4000,
    schema: FORMAT,
  });
  const parsed = Candidates.safeParse(parseJsonLoose(res.content));
  if (!parsed.success) {
    console.warn(`  [cerca] ${topic.id}: risposta non valida da ${res.model} (${res.finishReason})`);
    return { urls: [], citations: res.citations, cost: res.cost, model: res.model };
  }
  return { urls: parsed.data.pages.map((p) => p.url), citations: res.citations, cost: res.cost, model: res.model };
}

async function knownUrls(db: Db, urls: string[]): Promise<Set<string>> {
  if (!urls.length) return new Set();
  const rows = await db.select({ url: eventSources.url }).from(eventSources).where(inArray(eventSources.url, urls));
  return new Set(rows.map((r) => r.url));
}

/**
 * Eventi letti dalla pagina: JSON-LD se c'è (gratis), altrimenti LLM sul testo della pagina.
 * JSON-LD con l'evento di questo URL → solo quello; senza corrispondenza è una pagina lista → tutti.
 */
async function readPage(source: Source, url: string): Promise<RawEvent[]> {
  const html = await fetchText(url);
  const fromJsonLd = extractJsonLd(html, url);
  const own = fromJsonLd.find((e) => normalizeUrl(e.url) === url);
  if (own) return [{ ...own, url }];
  if (fromJsonLd.length) return fromJsonLd;
  checkBudget();
  return llmAdapter.extract(source, { url, body: html });
}

async function runTopic(db: Db, topic: SearchTopic, days: number) {
  const now = new Date();
  const window = { from: now, to: new Date(now.getTime() + days * 86_400_000) };
  const max = topic.maxPages ?? 8;
  const sourceId = `web:${topic.id}`;

  checkBudget();
  const found = await discover(topic, window, max);
  const { kept, dropped } = groundCandidates(found.urls, found.citations);
  const known = await knownUrls(db, kept);
  const toRead = kept.filter((u) => !known.has(u)).slice(0, max);
  console.log(
    `  ${topic.id}: ${found.urls.length} candidati (${found.model}, ${found.citations.length} citazioni, ${found.cost.toFixed(4)} $)` +
      ` → scartati ${dropped}, già noti ${known.size}, da leggere ${toRead.length}`,
  );

  const raw: RawEvent[] = [];
  let failed = 0;
  let lastHost = "";
  let stop: BudgetExceeded | null = null;
  for (const url of toRead) {
    const host = new URL(url).host;
    // Stesso host: 1 req/s, come per le pagine dettaglio
    if (host === lastHost) await new Promise((r) => setTimeout(r, PAUSE_MS));
    lastHost = host;
    try {
      raw.push(...(await readPage({ id: sourceId, name: host, url, format: "html" }, url)));
    } catch (err) {
      // Budget finito: si salva quanto già letto, poi ci si ferma
      if (err instanceof BudgetExceeded) {
        stop = err;
        break;
      }
      failed++;
      console.warn(`  [pagina] ${url}: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Finestra con mezza giornata di margine: un evento di stamattina conta ancora
  const inPeriod = raw.filter((e) => inWindow(e, { from: new Date(now.getTime() - 12 * 3_600_000), to: window.to }));
  const { rows, stats } = await persistEvents(db, { id: sourceId, category: topic.category }, inPeriod, { dryRun: args["dry-run"] });
  console.log(
    `  ${topic.id}: letti ${raw.length}, fuori periodo ${raw.length - inPeriod.length}, pagine fallite ${failed}` +
      ` → salvati ${stats.saved}, fusi ${stats.merged}, esclusi ${stats.excluded}, passati ${stats.past}`,
  );
  if (args["dry-run"]) {
    console.table(rows.map((r) => ({ title: r.title.slice(0, 50), startsAt: r.startsAt, city: r.city, url: r.url.slice(0, 60) })));
  }
  if (stop) {
    stop.saved = stats.saved;
    throw stop;
  }
  return stats.saved;
}

async function main() {
  if (!hasApiKey()) {
    console.log("Ricerca web: OPENROUTER_API_KEY assente, salto.");
    return;
  }
  const days = Number(args.days);
  if (!Number.isFinite(days) || days < 1) throw new Error(`--days non valido: ${args.days}`);
  if (!Number.isFinite(BUDGET) || BUDGET <= 0) throw new Error(`budget non valido: ${BUDGET}`);

  const topics = await loadTopics(args.query);
  console.log(`Ricerca web: ${topics.length} temi · modello ${MODEL} · motore ${ENGINE} · budget ${BUDGET.toFixed(2)} $${args["dry-run"] ? " · dry-run" : ""}`);

  const db = createDb();
  let saved = 0;
  let failures = 0;
  for (const topic of topics) {
    try {
      saved += await runTopic(db, topic, days);
    } catch (err) {
      if (err instanceof BudgetExceeded) {
        saved += err.saved;
        console.warn(`■ stop: ${err.message}`);
        break;
      }
      failures++;
      console.error(`✗ ${topic.id}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`Ricerca web: spesa ${spentUsd().toFixed(4)} $, eventi salvati ${saved}`);
  if (!args["dry-run"] && saved) await revalidateSite();
  if (topics.length && failures === topics.length) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
