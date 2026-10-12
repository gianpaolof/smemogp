import { test } from "node:test";
import assert from "node:assert/strict";
import { endOf } from "./agenda";
import {
  countUpcoming,
  idsForUrl,
  isPastEntry,
  MAX_URL_IDS,
  mergeSnapshots,
  parseSaved,
  pruneSaved,
  toggleEntry,
  type SavedEntry,
} from "./saved";

const id = (n: number) => n.toString(16).padStart(40, "0");
const entry = (n: number, until: string | null = null, title: string | null = `e${n}`): SavedEntry => ({
  id: id(n),
  title,
  until,
});

// Lunedì 12 ottobre 2026, 10:00 a Torino (CEST, UTC+2)
const NOW = new Date("2026-10-12T08:00:00Z");

test("parseSaved: JSON corrotto o tipi sbagliati → lista vuota o voci scartate", () => {
  assert.deepEqual(parseSaved("{non json"), []);
  assert.deepEqual(parseSaved(null), []);
  assert.deepEqual(parseSaved({ id: id(1) }), []);
  assert.deepEqual(parseSaved(42), []);
  const list = parseSaved([
    null,
    7,
    "non-un-id",
    { id: "ABC" },
    { id: id(1), title: 5, until: "domani" },
    { id: id(2), title: "x".repeat(400), until: "2026-10-12T20:00:00.000Z" },
  ]);
  assert.deepEqual(list[0], { id: id(1), title: null, until: null });
  assert.equal(list[1].title?.length, 300);
  assert.equal(list[1].until, "2026-10-12T20:00:00.000Z");
  assert.equal(list.length, 2);
});

test("parseSaved: migra il vecchio formato string[] e accetta il JSON grezzo", () => {
  assert.deepEqual(parseSaved([id(1), id(2)]), [
    { id: id(1), title: null, until: null },
    { id: id(2), title: null, until: null },
  ]);
  assert.deepEqual(parseSaved(JSON.stringify([id(3)])), [{ id: id(3), title: null, until: null }]);
});

test("parseSaved: duplicati tenendo il primo", () => {
  const list = parseSaved([{ id: id(1), title: "primo", until: null }, id(1), { id: id(1), title: "terzo" }]);
  assert.deepEqual(list, [{ id: id(1), title: "primo", until: null }]);
});

test("pruneSaved: via i passati da oltre 30 giorni, stesso riferimento se nulla cambia", () => {
  const recent = entry(1, "2026-09-20T20:00:00Z");
  const old = entry(2, "2026-09-01T20:00:00Z");
  const future = entry(3, "2026-10-20T20:00:00Z");
  const unknown = entry(4, null);
  assert.deepEqual(pruneSaved([recent, old, future, unknown], NOW), [recent, future, unknown]);
  const kept = [recent, future, unknown];
  assert.equal(pruneSaved(kept, NOW), kept);
});

test("mostra multi-giorno: non passata finché until è futuro", () => {
  const until = endOf({ startsAt: "2026-10-01T18:00:00Z", endsAt: "2026-10-31T18:00:00Z" }).toISOString();
  const show = entry(1, until);
  assert.equal(isPastEntry(show, NOW), false);
  assert.equal(countUpcoming([show], NOW), 1);
  assert.equal(isPastEntry(show, new Date("2026-11-01T00:00:00Z")), true);
});

test("until null conta come futuro; i passati non contano", () => {
  const list = [entry(1, null), entry(2, "2026-10-11T20:00:00Z"), entry(3, "2026-10-12T08:00:00Z")];
  assert.equal(isPastEntry(list[0], NOW), false);
  assert.equal(countUpcoming(list, NOW), 1); // until == now è già passato
});

test("toggleEntry: aggiunge in testa, due volte = lista iniziale", () => {
  const start = [entry(1), entry(2)];
  const added = toggleEntry(start, entry(3));
  assert.equal(added.saved, true);
  assert.deepEqual(added.list.map((e) => e.id), [id(3), id(1), id(2)]);
  const removed = toggleEntry(added.list, entry(3));
  assert.equal(removed.saved, false);
  assert.deepEqual(removed.list, start);
});

test("mergeSnapshots: completa title/until, stesso riferimento se nulla cambia", () => {
  const list = [entry(1, null, null), entry(2, "2026-10-20T20:00:00Z")];
  const merged = mergeSnapshots(list, [{ id: id(1), title: "Concerto", until: "2026-10-13T21:00:00Z" }]);
  assert.deepEqual(merged[0], { id: id(1), title: "Concerto", until: "2026-10-13T21:00:00Z" });
  assert.equal(merged[1], list[1]);
  assert.equal(mergeSnapshots(merged, [merged[0], merged[1]]), merged);
  assert.equal(mergeSnapshots(list, []), list);
});

test("idsForUrl: i primi MAX_URL_IDS", () => {
  const list = Array.from({ length: MAX_URL_IDS + 10 }, (_, i) => entry(i + 1));
  const ids = idsForUrl(list);
  assert.equal(ids.length, MAX_URL_IDS);
  assert.equal(ids[0], id(1));
});
