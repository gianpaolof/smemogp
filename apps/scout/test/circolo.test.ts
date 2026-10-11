import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { monthUrls, parseCircoloPage } from "../src/adapters/custom/circolo.ts";
import { parseDateTime } from "../src/lib/itdate.ts";

test("parseDateTime: ora di Torino con offset estivo e invernale", () => {
  assert.equal(parseDateTime("giovedì 1 ottobre 2026 | ore 18:30")?.startsAt.toISOString(), "2026-10-01T16:30:00.000Z");
  // dopo il cambio ora del 25 ottobre
  assert.equal(parseDateTime("lunedì 26 ottobre 2026 | ore 18.30")?.startsAt.toISOString(), "2026-10-26T17:30:00.000Z");
  assert.equal(parseDateTime("sabato 17 ottobre 2026")?.allDay, true);
  assert.equal(parseDateTime("nessuna data"), null);
});

test("archivio mensile: schede con titolo, data, luogo", () => {
  const html = readFileSync(new URL("fixtures/circolo-2026-10.html", import.meta.url), "utf8");
  const events = parseCircoloPage(html);
  assert.ok(events.length >= 3, `trovati ${events.length}`);
  for (const e of events) {
    assert.ok(e.title && e.url.startsWith("https://torino.circololettori.it/"));
    assert.ok(!Number.isNaN(e.startsAt.getTime()));
  }
  const first = events[0];
  assert.equal(first.allDay, false);
  assert.ok(first.venueName, "luogo presente");
});

test("mese corrente e successivo, anche a dicembre", () => {
  assert.deepEqual(monthUrls(new Date("2026-12-15T12:00:00Z")), [
    "https://torino.circololettori.it/eventi/2026/12/",
    "https://torino.circololettori.it/eventi/2027/01/",
  ]);
});
