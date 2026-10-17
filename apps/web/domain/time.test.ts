import { test } from "node:test";
import assert from "node:assert";
import { rangeBounds, isWeekendDay } from "./time";

test("rangeBounds: single day", () => {
  const { from, to } = rangeBounds("2026-10-17", "2026-10-17");
  // Ottobre prima del 25 = ora legale: mezzanotte di Roma = 22 UTC del giorno prima
  assert.strictEqual(from.toISOString(), "2026-10-16T22:00:00.000Z");
  assert.strictEqual(to.toISOString(), "2026-10-17T22:00:00.000Z");
});

test("rangeBounds: multi-day interval", () => {
  const { from, to } = rangeBounds("2026-10-17", "2026-10-19");
  const days = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
  assert.strictEqual(Math.round(days), 3);
});

test("rangeBounds: DST crossing (25 Oct 2026)", () => {
  // 24–26 ott inclusi = 3 giorni; il 25 le 3 tornano alle 2 e quel giorno dura 25 ore
  const { from, to } = rangeBounds("2026-10-24", "2026-10-26");
  const hours = (to.getTime() - from.getTime()) / (60 * 60 * 1000);
  assert.strictEqual(hours, 73);
});

test("isWeekendDay: Saturday", () => {
  assert.strictEqual(isWeekendDay("2026-10-17"), true); // Sabato
});

test("isWeekendDay: Sunday", () => {
  assert.strictEqual(isWeekendDay("2026-10-18"), true); // Domenica
});

test("isWeekendDay: Weekday", () => {
  assert.strictEqual(isWeekendDay("2026-10-19"), false); // Lunedì
});
