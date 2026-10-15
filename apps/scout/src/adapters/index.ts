import type { Adapter, Source } from "../types";
import { circoloAdapter } from "./custom/circolo";
import { comuneAdapter } from "./custom/comune";
import { egizioAdapter } from "./custom/egizio";
import { magazzinoAdapter } from "./custom/magazzino";
import { maoAdapter } from "./custom/mao";
import { taccoAdapter } from "./custom/tacco";
import { tribeAdapter } from "./custom/tribe";
import { zeroAdapter } from "./custom/zero";
import { icalAdapter } from "./ical";
import { extractJsonLd } from "./jsonld";
import { llmAdapter } from "./llm";

const custom: Record<string, Adapter> = {
  circolo: circoloAdapter,
  comune: comuneAdapter,
  egizio: egizioAdapter,
  magazzino: magazzinoAdapter,
  mao: maoAdapter,
  tacco: taccoAdapter,
  tribe: tribeAdapter,
  zero: zeroAdapter,
};

/** HTML: JSON-LD (gratis). LLM solo se la fonte lo chiede (`llm: true`): costa a ogni run. */
const htmlAdapter: Adapter = {
  extract: async (source, content) => {
    const fromJsonLd = extractJsonLd(content.body, content.url);
    if (fromJsonLd.length || !source.llm) return fromJsonLd;
    return llmAdapter.extract(source, content);
  },
};

export function adapterFor(source: Source): Adapter {
  if (source.adapter) {
    const a = custom[source.adapter];
    if (!a) throw new Error(`Adapter "${source.adapter}" non registrato`);
    return a;
  }
  switch (source.format) {
    case "ical":
      return icalAdapter;
    case "rss":
      return llmAdapter;
    case "jsonld":
    case "html":
    case "js":
      return htmlAdapter;
    default:
      throw new Error(`Formato "${source.format}" richiede un adapter dedicato`);
  }
}
