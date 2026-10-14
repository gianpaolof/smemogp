import { z } from "zod";

/**
 * Client minimo per OpenRouter (endpoint compatibile OpenAI): una chiave, qualsiasi modello.
 * Il modello si cambia da env/flag, non dal codice. Costo letto da `usage.cost` di ogni risposta.
 */
// Override solo per test locali contro un server finto
const BASE_URL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

export const DEFAULT_MODEL = "anthropic/claude-haiku-5.5";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type JsonSchemaFormat = { name: string; schema: Record<string, unknown> };

export type ChatRequest = {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  /** Output strutturato (`response_format: json_schema`, strict); instrada solo verso provider che lo supportano */
  schema?: JsonSchemaFormat;
  /** Tool lato server, es. `{ type: "openrouter:web_search", parameters: {...} }` */
  tools?: unknown[];
  /** Tetto ai passi dei tool lato server (default OpenRouter 30) */
  maxToolCalls?: number;
  timeoutMs?: number;
};

export type ChatResult = {
  content: string;
  /** URL delle annotazioni `url_citation` (risultati di ricerca visti dal modello) */
  citations: string[];
  /** USD, da `usage.cost` */
  cost: number;
  /** Modello effettivamente servito */
  model: string;
  finishReason: string | null;
};

export class OpenRouterError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

let spent = 0;
/** Spesa cumulata del processo (USD), per i budget dei run. */
export const spentUsd = () => spent;

export const hasApiKey = () => Boolean(process.env.OPENROUTER_API_KEY);

/** Schema zod → `response_format` strict. zod 4 mette già required su tutto e additionalProperties false. */
export function jsonSchemaFormat(name: string, schema: z.ZodType): JsonSchemaFormat {
  const { $schema: _, ...json } = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  return { name, schema: json };
}

/** JSON dal testo del modello: puro, in un blocco ```json, o tra la prima { e l'ultima }. */
export function parseJsonLoose(text: string): unknown {
  const attempts = [text.trim(), text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]?.trim()];
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) attempts.push(text.slice(start, end + 1));
  for (const candidate of attempts) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      // prova il successivo
    }
  }
  return null;
}

type Annotation = { type?: string; url_citation?: { url?: string } };

/** Estrae gli URL citati; tollera annotazioni assenti o di altro tipo. */
export function citationUrls(annotations: unknown): string[] {
  if (!Array.isArray(annotations)) return [];
  return (annotations as Annotation[])
    .filter((a) => a?.type === "url_citation" && typeof a.url_citation?.url === "string")
    .map((a) => a.url_citation!.url!);
}

export async function chat(req: ChatRequest): Promise<ChatResult> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY mancante");

  const body = {
    model: req.model,
    messages: req.messages,
    max_tokens: req.maxTokens ?? 8000,
    ...(req.schema && {
      response_format: { type: "json_schema", json_schema: { ...req.schema, strict: true } },
      provider: { require_parameters: true },
    }),
    ...(req.tools && { tools: req.tools }),
    ...(req.maxToolCalls && { max_tool_calls: req.maxToolCalls }),
  };

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json", "x-title": "smemogp-scout" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(req.timeoutMs ?? 180_000),
  });
  const data = (await res.json().catch(() => null)) as {
    error?: { message?: string };
    model?: string;
    usage?: { cost?: number };
    choices?: { finish_reason?: string | null; message?: { content?: string | null; annotations?: unknown } }[];
  } | null;

  const cost = Number(data?.usage?.cost) || 0;
  spent += cost;
  if (!res.ok || data?.error) {
    throw new OpenRouterError(`OpenRouter ${res.status}: ${data?.error?.message ?? res.statusText}`, res.status);
  }
  const choice = data?.choices?.[0];
  return {
    content: choice?.message?.content ?? "",
    citations: citationUrls(choice?.message?.annotations),
    cost,
    model: data?.model ?? req.model,
    finishReason: choice?.finish_reason ?? null,
  };
}

/**
 * Chiamata con output strutturato. Se modello/provider rifiutano lo schema (o lo schema insieme
 * ai tool: combinazione non documentata) ritenta chiedendo il JSON nel testo. Il chiamante
 * rivalida sempre con zod: lo strict non è garantito da tutti i provider.
 */
export async function chatJson(req: ChatRequest & { schema: JsonSchemaFormat }): Promise<ChatResult> {
  try {
    return await chat(req);
  } catch (err) {
    // 401/402 (chiave, credito) e 5xx non dipendono dallo schema: inutile ritentare
    if (!(err instanceof OpenRouterError) || err.status >= 500 || err.status === 401 || err.status === 402) throw err;
    console.warn(`  [openrouter] ${req.model}: schema non accettato (${err.message}), ritento con JSON nel testo`);
    const { schema, ...rest } = req;
    const hint = `Rispondi solo con un oggetto JSON conforme a questo JSON Schema, senza altro testo:\n${JSON.stringify(schema.schema)}`;
    return chat({ ...rest, messages: [...rest.messages, { role: "system", content: hint }] });
  }
}

/** Metadati pubblici di un modello (prezzi, parametri supportati); null se l'id non esiste. */
export async function modelInfo(id: string) {
  const res = await fetch(`${BASE_URL}/models`, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`OpenRouter /models: HTTP ${res.status}`);
  const { data } = (await res.json()) as {
    data: { id: string; context_length: number; pricing: { prompt: string; completion: string }; supported_parameters?: string[] }[];
  };
  const m = data.find((x) => x.id === id);
  if (!m) return null;
  const params = m.supported_parameters ?? [];
  return {
    id: m.id,
    contextLength: m.context_length,
    /** USD per milione di token */
    inputPerM: Number(m.pricing.prompt) * 1e6,
    outputPerM: Number(m.pricing.completion) * 1e6,
    tools: params.includes("tools"),
    structuredOutputs: params.includes("structured_outputs"),
  };
}
