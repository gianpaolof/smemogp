import { test } from "node:test";
import assert from "node:assert/strict";
import { Candidates, discoveryMessages, groundCandidates, inWindow, loadTopics, normalizeUrl } from "../src/lib/search.ts";

test("normalizeUrl: niente frammento, tracciamento, slash finale; solo http(s)", () => {
  assert.equal(normalizeUrl("https://www.a.it/ev/1/?utm_source=x&id=3#top"), "https://www.a.it/ev/1/?id=3");
  assert.equal(normalizeUrl("https://a.it/ev/1/"), "https://a.it/ev/1");
  assert.equal(normalizeUrl("https://a.it/e?fbclid=1"), "https://a.it/e");
  assert.equal(normalizeUrl("javascript:alert(1)"), null);
  assert.equal(normalizeUrl("non un url"), null);
});

test("groundCandidates: tiene solo host citati (www ignorato), deduplica", () => {
  const { kept, dropped } = groundCandidates(
    ["https://www.blah.it/ev/1", "https://blah.it/ev/1/", "https://inventato.com/x", "boh"],
    ["https://blah.it/eventi", "https://altro.it/"],
  );
  assert.deepEqual(kept, ["https://www.blah.it/ev/1", "https://blah.it/ev/1"]);
  assert.equal(dropped, 2);
});

test("groundCandidates: senza citazioni tiene tutto (decide la verifica della pagina)", () => {
  const { kept } = groundCandidates(["https://a.it/1", "https://a.it/1#x"], []);
  assert.deepEqual(kept, ["https://a.it/1"]);
});

test("inWindow: eventi che toccano il periodo, mostre in corso incluse", () => {
  const w = { from: new Date("2026-10-14T00:00:00Z"), to: new Date("2026-12-13T00:00:00Z") };
  assert.equal(inWindow({ startsAt: new Date("2026-10-20T19:00:00Z") }, w), true);
  assert.equal(inWindow({ startsAt: new Date("2026-09-01T00:00:00Z"), endsAt: new Date("2026-11-30T00:00:00Z") }, w), true);
  assert.equal(inWindow({ startsAt: new Date("2026-10-01T19:00:00Z"), endsAt: null }, w), false);
  assert.equal(inWindow({ startsAt: new Date("2027-01-10T19:00:00Z") }, w), false);
});

test("searches.json valido e con id unici", async () => {
  const topics = await loadTopics();
  assert.ok(topics.length > 0);
  assert.equal(new Set(topics.map((t) => t.id)).size, topics.length);
  await assert.rejects(loadTopics("non-esiste"), /non in searches.json/);
});

test("discoveryMessages: periodo, limite e regole sui gusti nel prompt", () => {
  const [system, user] = discoveryMessages(
    { id: "x", query: "jazz a Torino" },
    { from: new Date("2026-10-14T10:00:00Z"), to: new Date("2026-12-13T10:00:00Z") },
    7,
  );
  assert.match(system.content, /Al massimo 7 pagine/);
  assert.match(system.content, /Teatro Regio/);
  assert.match(system.content, /non inventarli/);
  assert.match(user.content, /jazz a Torino/);
  assert.match(user.content, /dal 2026-10-14 al 2026-12-13/);
});

test("Candidates: rifiuta forme sbagliate", () => {
  assert.equal(Candidates.safeParse({ pages: [{ url: "https://a.it", title: "A" }] }).success, true);
  assert.equal(Candidates.safeParse({ pages: [{ link: "https://a.it" }] }).success, false);
  assert.equal(Candidates.safeParse(null).success, false);
});
