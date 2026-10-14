// Prova un modello OpenRouter prima di usarlo nello scout: capacità, prezzo, una chiamata strutturata
// e (con --search) una ricerca web reale. Costo tipico: frazioni di centesimo.
import { parseArgs } from "node:util";
import { z } from "zod";
import { chat, DEFAULT_MODEL, hasApiKey, jsonSchemaFormat, modelInfo, parseJsonLoose, spentUsd } from "./lib/openrouter";

const { values: args } = parseArgs({
  options: {
    model: { type: "string" },
    engine: { type: "string", default: "exa" },
    search: { type: "boolean", default: false },
  },
});

const model = args.model || process.env.SCOUT_SEARCH_MODEL || process.env.SCOUT_LLM_MODEL || DEFAULT_MODEL;

const Probe = z.object({ city: z.string(), events: z.array(z.object({ title: z.string(), date: z.string() })) });

async function main() {
  const info = await modelInfo(model);
  if (!info) throw new Error(`Modello "${model}" non trovato su OpenRouter (vedi https://openrouter.ai/models)`);
  console.log(`${info.id}: ${info.inputPerM.toFixed(2)} $ / ${info.outputPerM.toFixed(2)} $ per M token, contesto ${info.contextLength}`);
  console.log(`  tools: ${info.tools ? "sì" : "NO"} · structured_outputs: ${info.structuredOutputs ? "sì" : "NO (si userà JSON nel testo)"}`);
  if (!info.tools) console.warn("  ⚠ senza tools il modello non può usare la ricerca web");

  if (!hasApiKey()) {
    console.log("OPENROUTER_API_KEY assente: solo metadati.");
    return;
  }

  const t0 = Date.now();
  const res = await chat({
    model,
    maxTokens: 500,
    ...(info.structuredOutputs && { schema: jsonSchemaFormat("probe", Probe) }),
    messages: [
      { role: "system", content: 'Rispondi solo con JSON: {"city": string, "events": [{"title": string, "date": "YYYY-MM-DD"}]}' },
      { role: "user", content: "Inventa due eventi di esempio a Torino il 2026-11-01 (è solo un test di formato)." },
    ],
  });
  const ok = Probe.safeParse(parseJsonLoose(res.content)).success;
  console.log(`  output strutturato: ${ok ? "valido" : "NON valido"} (${Date.now() - t0} ms, ${res.cost.toFixed(5)} $, servito da ${res.model})`);

  if (args.search) {
    const t1 = Date.now();
    const s = await chat({
      model,
      maxTokens: 1500,
      maxToolCalls: 2,
      tools: [{ type: "openrouter:web_search", parameters: { engine: args.engine, max_results: 3, max_uses: 1 } }],
      messages: [{ role: "user", content: "Cerca sul web un concerto a Torino nelle prossime settimane e dammi il link alla sua pagina." }],
    });
    console.log(`  ricerca (${args.engine}): ${s.citations.length} citazioni, ${Date.now() - t1} ms, ${s.cost.toFixed(5)} $`);
    for (const url of s.citations.slice(0, 3)) console.log(`    ${url}`);
  }
  console.log(`Totale: ${spentUsd().toFixed(5)} $`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
