import { test } from "node:test";
import assert from "node:assert/strict";
import { detailLinks, pickDetailEvent } from "../src/lib/detail.ts";
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
