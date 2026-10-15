import { test } from "node:test";
import assert from "node:assert";
import { rangeBounds, isWeekendDay } from "./time";

test("rangeBounds: single day", () => {
  const { from, to } = rangeBounds("2026-10-17", "2026-10-17");
  assert.strictEqual(from.getUTCHours(), 23); // Roma midnight = 23 UTC
  assert.strictEqual(to.getUTCHours(), 23); // Next midnight
});

test("rangeBounds: multi-day interval", () => {
  const { from, to } = rangeBounds("2026-10-17", "2026-10-19");
  const days = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
  assert.strictEqual(Math.round(days), 3);
});

test("rangeBounds: DST crossing (25 Oct 2026)", () => {
  // 25 Oct 2026 3am → 2am (clocks back, hour repeats), interval = 25 hours
  const { from, to } = rangeBounds("2026-10-24", "2026-10-26");
  const ms = to.getTime() - from.getTime();
  const hours = ms / (60 * 60 * 1000);
  assert(hours >= 50 && hours <= 52, `Expected ~51 hours (DST), got ${hours}`);
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
