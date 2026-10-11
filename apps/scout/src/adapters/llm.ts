import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CATEGORIES } from "@smemogp/db";
import { chunkText, htmlToText } from "../lib/html";
import type { Adapter, RawEvent, Source } from "../types";

// Lazy: le fonti JSON-LD/iCal girano anche senza API key
let client: Anthropic | undefined;
// Estrazione strutturata da testo: Haiku basta e costa ~40× meno di Opus
const MODEL = process.env.SCOUT_LLM_MODEL || "claude-haiku-5-5";

const ExtractedEvents = z.object({
  events: z.array(
    z.object({
      title: z.string(),
      startsAt: z.string().describe("ISO 8601 con offset Europe/Rome, es. 2026-10-12T21:00:00+02:00; solo data se ora ignota"),
      endsAt: z.string().nullable(),
      allDay: z.boolean(),
      venueName: z.string().nullable(),
      address: z.string().nullable(),
      city: z.string().nullable(),
      category: z.enum(CATEGORIES),
      priceText: z.string().nullable(),
      imageUrl: z.string().nullable(),
      url: z.string().nullable().describe("Link alla pagina dettaglio dell'evento, se presente"),
      description: z.string().nullable().describe("Max 2 frasi"),
    }),
  ),
});

const SYSTEM = `Estrai eventi da pagine web italiane (Piemonte) per un'app che li mostra su mappa.
Includi solo eventi reali con una data: ignora menu, pubblicità, articoli senza data, eventi già conclusi.
Se l'anno manca, deducilo dalla data odierna (evento futuro più vicino).
Per eventi su più giorni (mostre, festival) usa startsAt = inizio, endsAt = fine.
Indirizzo e città servono per il geocoding: riportali il più completi possibile.
Se la pagina non contiene eventi, restituisci una lista vuota.`;

async function extractChunk(source: Source, pageUrl: string, text: string): Promise<RawEvent[]> {
  const today = new Date().toLocaleDateString("it-IT", { timeZone: "Europe/Rome", dateStyle: "full" });
  client ??= new Anthropic();
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(ExtractedEvents) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Oggi: ${today}\nFonte: ${source.name}\nURL: ${pageUrl}\n\n<pagina>\n${text}\n</pagina>`,
      },
    ],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    console.warn(`[llm] ${source.id}: nessun output (${response.stop_reason})`);
    return [];
  }

  return response.parsed_output.events
    .map((e) => ({
      ...e,
      startsAt: new Date(e.startsAt),
      endsAt: e.endsAt ? new Date(e.endsAt) : null,
      url: e.url ? new URL(e.url, pageUrl).href : pageUrl,
    }))
    .filter((e) => !Number.isNaN(e.startsAt.getTime()));
}

/** Fallback generico: HTML → testo → eventi strutturati via Claude. */
export const llmAdapter: Adapter = {
  extract: async (source, content) => {
    const text = /<html|<body/i.test(content.body) ? htmlToText(content.body, content.url) : content.body;
    const results: RawEvent[] = [];
    for (const chunk of chunkText(text)) {
      results.push(...(await extractChunk(source, content.url, chunk)));
    }
    return results;
  },
};
