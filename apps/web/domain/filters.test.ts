import { test } from "node:test";
import assert from "node:assert";
import { parseFilters, serializeFilters, DEFAULT_FILTERS } from "./filters";

test("parseFilters: default when empty", () => {
  const f = parseFilters(new URLSearchParams());
  assert.deepStrictEqual(f, DEFAULT_FILTERS);
});

test("parseFilters: custom date range", () => {
  const f = parseFilters(new URLSearchParams("dal=2026-10-17&al=2026-10-19"));
  assert.strictEqual(f.period, "custom");
  assert.strictEqual(f.range?.from, "2026-10-17");
  assert.strictEqual(f.range?.to, "2026-10-19");
});

test("parseFilters: weekendOnly toggle", () => {
  const f = parseFilters(new URLSearchParams("dal=2026-10-17&al=2026-10-19&solo=1"));
  assert.strictEqual(f.weekendOnly, true);
});

test("parseFilters: clamps range to 60 days", () => {
  const f = parseFilters(new URLSearchParams("dal=2026-10-17&al=2026-12-31"));
  assert.ok(f.range);
  const days = Math.ceil((new Date(f.range.to).getTime() - new Date(f.range.from).getTime()) / (24 * 60 * 60 * 1000));
  assert.strictEqual(days, 60);
});

test("parseFilters: rejects al < dal", () => {
  const f = parseFilters(new URLSearchParams("dal=2026-10-19&al=2026-10-17"));
  assert.strictEqual(f.range, null); // Falls back to period
});

test("serializeFilters: omits default values", () => {
  const f = { ...DEFAULT_FILTERS };
  const qs = serializeFilters(f);
  assert.strictEqual(qs, "");
});

test("serializeFilters: includes custom date range", () => {
  const f = { ...DEFAULT_FILTERS, period: "custom" as const, range: { from: "2026-10-17", to: "2026-10-19" } };
  const qs = serializeFilters(f);
  assert(qs.includes("dal=2026-10-17"));
  assert(qs.includes("al=2026-10-19"));
});

test("parseFilters + serializeFilters round-trip", () => {
  const original = "dal=2026-10-17&al=2026-10-19&solo=1&cat=musica&raggio=10";
  const parsed = parseFilters(new URLSearchParams(original));
  const serialized = serializeFilters(parsed);
  const reparsed = parseFilters(new URLSearchParams(serialized));
  assert.deepStrictEqual(parsed, reparsed);
});
