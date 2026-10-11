import { test } from "node:test";
import assert from "node:assert/strict";
import { findDayRanges, rangeStartingOn } from "../src/lib/itdate.ts";

test("intervalli e date singole in italiano", () => {
  assert.deepEqual(findDayRanges("dal 10 al 11 ottobre 2026"), [{ from: "2026-10-10", to: "2026-10-11" }]);
  assert.deepEqual(findDayRanges("Dal 28 settembre al 2 novembre 2026"), [{ from: "2026-09-28", to: "2026-11-02" }]);
  assert.deepEqual(findDayRanges("dal 20 dicembre al 6 gennaio 2027"), [{ from: "2026-12-20", to: "2027-01-06" }]);
  assert.deepEqual(findDayRanges("sabato 17 Ottobre 2026 ore 21"), [{ from: "2026-10-17", to: "2026-10-17" }]);
});

test("rangeStartingOn sceglie l'intervallo dell'evento, non quelli dei correlati", () => {
  const text = "Pubblicato 01 ottobre 2026 · dal 10 al 11 ottobre 2026 · Correlati: dal 15 al 25 ottobre 2026";
  assert.deepEqual(rangeStartingOn(text, "2026-10-10"), { from: "2026-10-10", to: "2026-10-11" });
  assert.equal(rangeStartingOn(text, "2026-10-12"), undefined);
});
