// Verifica il catalogo fonti: raggiungibilità, formato reale, recenza. Non modifica sources.json.
import { parseArgs } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import { extractJsonLd } from "./adapters/jsonld";
import { readCatalog } from "./lib/sources";
import type { Source } from "./types";

const { values: args } = parseArgs({
  options: {
    only: { type: "string" },
    all: { type: "boolean", default: false }, // anche excluded/dead
  },
});

const USER_AGENT = "Mozilla/5.0 (compatible; smemogp-scout/0.1)";

type Check = {
  id: string;
  status: Source["status"];
  http: string;
  finalUrl: string;
  jsonLdEvents: number;
  ical: boolean;
  rss: boolean;
  futureDates: number;
  verdict: string;
};

/** Date future nel testo (anno corrente o prossimo): un 200 non prova che la fonte pubblichi. */
function countFutureYears(html: string) {
  const year = new Date().getFullYear();
  return (html.match(new RegExp(`\\b(${year}|${year + 1})\\b`, "g")) ?? []).length;
}

async function check(source: Source): Promise<Check> {
  const base = { id: source.id, status: source.status ?? "active" };
  try {
    const res = await fetch(source.url, {
      headers: { "user-agent": USER_AGENT, "accept-language": "it-IT" },
      signal: AbortSignal.timeout(20_000),
    });
    const html = await res.text();
    const jsonLdEvents = extractJsonLd(html, res.url).length;
    const ical = /\.ics\b|text\/calendar|webcal:/i.test(html);
    const rss = /application\/(rss|atom)\+xml/i.test(html);
    const futureDates = countFutureYears(html);
    const verdict = !res.ok
      ? res.status === 403
        ? "bloccata (403)"
        : `errore HTTP ${res.status}`
      : jsonLdEvents
        ? "JSON-LD in lista"
        : futureDates < 3
          ? "recenza dubbia"
          : source.detail || source.adapter
            ? "ok (dettaglio/adapter)"
            : "nessun dato strutturato: skill o adapter";
    return { ...base, http: String(res.status), finalUrl: res.url, jsonLdEvents, ical, rss, futureDates, verdict };
  } catch (err) {
    const cause = (err as { cause?: { code?: string } }).cause?.code ?? (err as Error).message;
    const verdict = /CERT|TLS|SSL/i.test(cause) ? "TLS" : /ENOTFOUND|EAI_AGAIN/.test(cause) ? "DNS" : cause;
    return { ...base, http: "—", finalUrl: "", jsonLdEvents: 0, ical: false, rss: false, futureDates: 0, verdict };
  }
}

async function main() {
  const catalog = await readCatalog();
  const sources = catalog.filter((s) =>
    args.only ? s.id === args.only : args.all || !["excluded", "dead"].includes(s.status ?? "active"),
  );
  const results: Check[] = [];
  for (const s of sources) {
    const r = await check(s);
    results.push(r);
    console.log(`${r.id.padEnd(24)} ${r.http.padEnd(4)} ld=${r.jsonLdEvents} anni=${r.futureDates} → ${r.verdict}`);
    await new Promise((res) => setTimeout(res, 500));
  }

  const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
  const rows = results.map(
    (r) =>
      `| ${r.id} | ${r.status} | ${r.http} | ${r.jsonLdEvents} | ${r.ical ? "sì" : ""} | ${r.rss ? "sì" : ""} | ${r.futureDates} | ${r.verdict} |`,
  );
  const report = [
    `# Verifica fonti ${date}`,
    "",
    "Generato da `npm run scout:verify`. Proposte di modifica a `sources.json` vanno approvate a mano.",
    "",
    "| Fonte | Stato catalogo | HTTP | JSON-LD | iCal | RSS | Anni futuri | Esito |",
    "|---|---|---|---|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
  const dir = new URL("../../../docs/research/", import.meta.url);
  await mkdir(dir, { recursive: true });
  const out = new URL(`sources-verify-${date}.md`, dir);
  await writeFile(out, report);
  console.log(`\nReport: docs/research/sources-verify-${date}.md`);
}

main();
