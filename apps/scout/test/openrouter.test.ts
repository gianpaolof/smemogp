import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { chat, chatJson, citationUrls, jsonSchemaFormat, OpenRouterError, parseJsonLoose, spentUsd } from "../src/lib/openrouter.ts";

test("parseJsonLoose: JSON puro, in blocco ```json, o dentro testo", () => {
  assert.deepEqual(parseJsonLoose('{"a":1}'), { a: 1 });
  assert.deepEqual(parseJsonLoose('Ecco:\n```json\n{"a":2}\n```\nfine'), { a: 2 });
  assert.deepEqual(parseJsonLoose('Risultati: {"pages":[]} — ciao'), { pages: [] });
  assert.equal(parseJsonLoose("nessun json"), null);
});

test("citationUrls: solo url_citation con url stringa", () => {
  const ann = [
    { type: "url_citation", url_citation: { url: "https://a.it/x", title: "A" } },
    { type: "file", file: {} },
    { type: "url_citation", url_citation: {} },
  ];
  assert.deepEqual(citationUrls(ann), ["https://a.it/x"]);
  assert.deepEqual(citationUrls(undefined), []);
});

test("jsonSchemaFormat: schema strict senza $schema", () => {
  const f = jsonSchemaFormat("x", z.object({ a: z.string(), b: z.string().nullable() }));
  assert.equal(f.name, "x");
  assert.equal("$schema" in f.schema, false);
  assert.deepEqual(f.schema.required, ["a", "b"]);
  assert.equal(f.schema.additionalProperties, false);
});

function stubFetch(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { calls, restore: () => (globalThis.fetch = original) };
}

test("chat: richiesta con schema, tool e limiti; risposta con citazioni e costo", async () => {
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  const before = spentUsd();
  const { calls, restore } = stubFetch(200, {
    model: "anthropic/claude-haiku-5.5",
    usage: { cost: 0.0123 },
    choices: [
      {
        finish_reason: "stop",
        message: { content: '{"pages":[]}', annotations: [{ type: "url_citation", url_citation: { url: "https://b.it" } }] },
      },
    ],
  });
  try {
    const res = await chat({
      model: "m/x",
      messages: [{ role: "user", content: "ciao" }],
      schema: { name: "s", schema: { type: "object" } },
      tools: [{ type: "openrouter:web_search" }],
      maxToolCalls: 3,
    });
    const body = JSON.parse(String(calls[0].init.body));
    assert.equal(calls[0].url, "https://openrouter.ai/api/v1/chat/completions");
    assert.equal((calls[0].init.headers as Record<string, string>).authorization, "Bearer sk-or-test");
    assert.equal(body.model, "m/x");
    assert.deepEqual(body.response_format, { type: "json_schema", json_schema: { name: "s", schema: { type: "object" }, strict: true } });
    assert.deepEqual(body.provider, { require_parameters: true });
    assert.deepEqual(body.tools, [{ type: "openrouter:web_search" }]);
    assert.equal(body.max_tool_calls, 3);
    assert.deepEqual(res.citations, ["https://b.it"]);
    assert.equal(res.content, '{"pages":[]}');
    assert.ok(Math.abs(spentUsd() - before - 0.0123) < 1e-9);
  } finally {
    restore();
  }
});

test("chat: senza schema niente response_format né provider", async () => {
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  const { calls, restore } = stubFetch(200, { choices: [{ message: { content: "ok" } }] });
  try {
    await chat({ model: "m/x", messages: [{ role: "user", content: "x" }] });
    const body = JSON.parse(String(calls[0].init.body));
    assert.equal("response_format" in body, false);
    assert.equal("provider" in body, false);
    assert.equal("tools" in body, false);
  } finally {
    restore();
  }
});

test("chat: errore HTTP → OpenRouterError con status e messaggio", async () => {
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  const { restore } = stubFetch(400, { error: { message: "structured outputs not supported" } });
  try {
    await assert.rejects(
      chat({ model: "m/x", messages: [{ role: "user", content: "x" }] }),
      (err: unknown) => err instanceof OpenRouterError && err.status === 400 && /not supported/.test(err.message),
    );
  } finally {
    restore();
  }
});

test("chatJson: 400 sullo schema → ritenta senza response_format, con lo schema nel prompt", async () => {
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  const bodies: Record<string, unknown>[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    bodies.push(body);
    const fail = "response_format" in body;
    return new Response(JSON.stringify(fail ? { error: { message: "no structured outputs" } } : { choices: [{ message: { content: "{}" } }] }), {
      status: fail ? 400 : 200,
    });
  }) as typeof fetch;
  try {
    const res = await chatJson({ model: "m/x", messages: [{ role: "user", content: "x" }], schema: { name: "s", schema: { type: "object" } } });
    assert.equal(res.content, "{}");
    assert.equal(bodies.length, 2);
    assert.equal("response_format" in bodies[1], false);
    const last = (bodies[1].messages as { content: string }[]).at(-1)!;
    assert.match(last.content, /JSON Schema/);
  } finally {
    globalThis.fetch = original;
  }
});

test("chatJson: 402 (credito) non ritenta", async () => {
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  const { calls, restore } = stubFetch(402, { error: { message: "insufficient credits" } });
  try {
    await assert.rejects(chatJson({ model: "m/x", messages: [], schema: { name: "s", schema: {} } }), /insufficient credits/);
    assert.equal(calls.length, 1);
  } finally {
    restore();
  }
});

test("chat: senza chiave errore esplicito", async () => {
  const key = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  try {
    await assert.rejects(chat({ model: "m/x", messages: [] }), /OPENROUTER_API_KEY mancante/);
  } finally {
    process.env.OPENROUTER_API_KEY = key;
  }
});
