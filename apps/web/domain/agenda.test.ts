import { test } from "node:test";
import assert from "node:assert";
import { touchesWeekend } from "./agenda";
import type { EventItem } from "./types";

const mockEvent = (startsAt: string, endsAt?: string): EventItem => ({
  id: "test",
  title: "Event",
  category: "musica",
  allDay: false,
  startsAt,
  endsAt: endsAt || startsAt,
  venueName: "Venue",
  city: "Torino",
  distanceKm: 5,
  lat: 45.0,
  lng: 7.5,
  url: "https://example.com",
  imageUrl: null,
  priceText: null,
  description: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  sourceId: "test",
  address: null,
});

test("touchesWeekend: weekday event excluded", () => {
  const e = mockEvent("2026-10-19T10:00:00Z");
  const from = new Date("2026-10-19T23:00:00Z");
  const to = new Date("2026-10-22T23:00:00Z");
  assert.strictEqual(touchesWeekend(e, from, to), false);
});

test("touchesWeekend: Saturday event included", () => {
  const e = mockEvent("2026-10-17T10:00:00Z");
  const from = new Date("2026-10-17T23:00:00Z");
  const to = new Date("2026-10-20T23:00:00Z");
  assert.strictEqual(touchesWeekend(e, from, to), true);
});

test("touchesWeekend: multi-day event spanning weekend", () => {
  const e = mockEvent("2026-10-16T10:00:00Z", "2026-10-19T18:00:00Z");
  const from = new Date("2026-10-17T23:00:00Z");
  const to = new Date("2026-10-20T23:00:00Z");
  assert.strictEqual(touchesWeekend(e, from, to), true);
});

test("touchesWeekend: multi-day event no weekend overlap", () => {
  const e = mockEvent("2026-10-19T10:00:00Z", "2026-10-21T18:00:00Z");
  const from = new Date("2026-10-19T23:00:00Z");
  const to = new Date("2026-10-22T23:00:00Z");
  assert.strictEqual(touchesWeekend(e, from, to), false);
});

test("touchesWeekend: Sunday event included", () => {
  const e = mockEvent("2026-10-18T10:00:00Z");
  const from = new Date("2026-10-17T23:00:00Z");
  const to = new Date("2026-10-20T23:00:00Z");
  assert.strictEqual(touchesWeekend(e, from, to), true);
});
