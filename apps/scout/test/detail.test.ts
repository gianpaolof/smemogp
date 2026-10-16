import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { detailLinks, eventbriteDescription, mergeDescription, pickDetailEvent } from "../src/lib/detail.ts";
import { exclusionReason } from "../src/lib/exclude.ts";
import { extractJsonLd } from "../src/adapters/jsonld.ts";
import type { RawEvent, Source } from "../src/types.ts";

const tt: Source = {
  id: "torinotoday",
  name: "TorinoToday",
  url: "https://www.torinotoday.it/eventi/",
  format: "html",
  detail: { linkPattern: "^/eventi/(?!dal/|weekend/)[a-z-]+/[a-z0-9-]+\\.html$", max: 2 },
};

const listHtml = `
  <a href="/eventi/cultura/portici-carta-2026.html">A</a>
  <a href="https://www.torinotoday.it/eventi/fiere/toma-condove-2026.html?utm=x">B</a>
  <a href="/eventi/weekend/cosa-fare-sabato.html">weekend</a>
  <a href="/eventi/dal/2026-10-11/al/2026-10-11/">range</a>
  <a href="//www.today.it/tv/news/ballando.html">editoriale</a>
  <a href="/eventi/cultura/portici-carta-2026.html">duplicato</a>
  <a href="/eventi/musica/terzo.html">oltre max</a>`;

test("linkPattern: solo pagine evento, senza query, senza duplicati, max", () => {
  const links = detailLinks(tt, [{ url: tt.url, body: listHtml }], []);
  assert.deepEqual(links, [
    "https://www.torinotoday.it/eventi/cultura/portici-carta-2026.html",
    "https://www.torinotoday.it/eventi/fiere/toma-condove-2026.html",
  ]);
});

test("senza linkPattern: url degli eventi in lista dello stesso host", () => {
  const eb: Source = { id: "eb", name: "EB", url: "https://www.eventbrite.it/d/italy--torino/all-events/", format: "jsonld", detail: {} };
  const list = [
    { title: "A", startsAt: new Date(), url: "https://www.eventbrite.it/e/a-123?aff=x" },
    { title: "B", startsAt: new Date(), url: "https://altro.it/b" },
  ] as RawEvent[];
  assert.deepEqual(detailLinks(eb, [], list), ["https://www.eventbrite.it/e/a-123"]);
});

test("pickDetailEvent preferisce l'evento con lo stesso url", () => {
  const found = [
    { title: "Correlato", startsAt: new Date(), url: "https://x.it/e/altro" },
    { title: "Giusto", startsAt: new Date(), url: "https://x.it/e/giusto/" },
  ] as RawEvent[];
  assert.equal(pickDetailEvent("https://x.it/e/giusto", found)?.title, "Giusto");
});

// Visto dal vivo (2026-10-16): il riassunto del JSON-LD non dice età né pubblico, il testo completo sì
test("Eventbrite: descrizione completa da __NEXT_DATA__, riassunto JSON-LD come ripiego", () => {
  const html = readFileSync(new URL("fixtures/eventbrite-yoga-baby.html", import.meta.url), "utf8");
  const url = "https://www.eventbrite.com/e/yoga-baby-cascina-roccafranca-tickets-1999693431885";
  const [summary] = extractJsonLd(html, url);
  assert.equal(exclusionReason(summary), null, "il solo riassunto non basta");

  const full = eventbriteDescription(html)!;
  assert.match(full, /^Yoga baby\ndai 2 ai 4 anni\n/);
  assert.match(full, /Per famiglie con bambini dai 2 ai 4 anni accompagnati da un adulto\.$/);
  assert.ok(exclusionReason({ ...summary, description: full }));

  assert.equal(eventbriteDescription("<html><body>altra fonte</body></html>"), null);
  assert.equal(eventbriteDescription(`<script id="__NEXT_DATA__">{"props":{}}</script>`), null);
});

// Regressione vista nel dry-run (2026-10-16): «per bambini» c'era solo nel riassunto
test("Eventbrite: il riassunto resta in testa se il testo completo non lo contiene", () => {
  const html = readFileSync(new URL("fixtures/eventbrite-saldo-junior.html", import.meta.url), "utf8");
  const [e] = extractJsonLd(html, "https://www.eventbrite.it/e/x");
  const full = eventbriteDescription(html)!;
  assert.equal(exclusionReason({ ...e, description: full }), null, "il solo testo completo non basta");
  const merged = mergeDescription(e.description, full)!;
  assert.ok(merged.startsWith("Corso base di saldatura a stagno per bambini"));
  assert.ok(exclusionReason({ ...e, description: merged }));

  assert.equal(mergeDescription("Breve.", "Breve. E poi altro."), "Breve. E poi altro.");
  assert.equal(mergeDescription("Breve.", null), "Breve.");
  assert.equal(mergeDescription(null, "Lungo."), "Lungo.");
});

test("detailLinks senza linkPattern: anche altri domini nazionali dello stesso sito", () => {
  const eb: Source = { id: "eventbrite-torino", name: "Eventbrite", url: "https://www.eventbrite.it/d/italy--torino/all-events/", format: "jsonld" };
  const ev = (url: string) => ({ title: "x", startsAt: new Date(), url }) as RawEvent;
  const links = detailLinks(eb, [], [ev("https://www.eventbrite.com/e/yoga-baby-1"), ev("https://www.eventbrite.it/e/b-2"), ev("https://altro.it/e/3")]);
  assert.deepEqual(links, ["https://www.eventbrite.com/e/yoga-baby-1", "https://www.eventbrite.it/e/b-2"]);
});
