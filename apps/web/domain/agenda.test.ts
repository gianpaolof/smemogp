import { test } from "node:test";
import assert from "node:assert/strict";
import { groupByDay, slotOf } from "./agenda";
import { periodBounds } from "./time";
import type { EventItem } from "./types";

const ev = (id: string, startsAt: string, extra: Partial<EventItem> = {}): EventItem => ({
  id,
  title: id,
  description: null,
  startsAt,
  endsAt: null,
  allDay: false,
  venueName: null,
  address: null,
  city: null,
  lat: 45,
  lng: 7,
  category: "musica",
  priceText: null,
  imageUrl: null,
  url: "https://example.org",
  sourceId: "x",
  createdAt: startsAt,
  updatedAt: startsAt,
  distanceKm: null,
  ...extra,
});

// Lunedì 12 ottobre 2026, 10:00 a Torino (CEST, UTC+2)
const now = new Date("2026-10-12T08:00:00Z");

test("le mostre già iniziate vanno nel riquadro «in corso» del primo giorno", () => {
  const days = groupByDay(
    [
      ev("mostra", "2026-10-02T08:00:00Z", { endsAt: "2026-12-01T17:00:00Z" }),
      ev("concerto", "2026-10-12T19:00:00Z"),
    ],
    "2026-10-12",
    now,
  );
  assert.equal(days.length, 1);
  assert.deepEqual(days[0].ongoing.map((e) => e.id), ["mostra"]);
  assert.deepEqual(days[0].events.map((e) => e.id), ["concerto"]);
});

test("stasera: dalle 17 di oggi alle 6 di domani, solo eventi con orario", () => {
  const { from, to } = periodBounds("stasera", now);
  assert.equal(from.toISOString(), "2026-10-12T15:00:00.000Z");
  assert.equal(to.toISOString(), "2026-10-13T04:00:00.000Z");
  const days = groupByDay(
    [
      ev("pomeriggio", "2026-10-12T13:00:00Z"),
      ev("sera", "2026-10-12T19:00:00Z"),
      ev("tutto-il-giorno", "2026-10-12T00:00:00Z", { allDay: true }),
    ],
    "2026-10-12",
    now,
    from,
  );
  assert.deepEqual(days.flatMap((d) => d.events.map((e) => e.id)), ["sera"]);
});

test("fascia oraria in ora di Roma", () => {
  assert.equal(slotOf(ev("a", "2026-10-12T07:30:00Z")), "mattina"); // 09:30
  assert.equal(slotOf(ev("b", "2026-10-12T13:00:00Z")), "pomeriggio"); // 15:00
  assert.equal(slotOf(ev("c", "2026-10-12T19:00:00Z")), "sera"); // 21:00
  assert.equal(slotOf(ev("d", "2026-10-12T23:30:00Z")), "sera"); // 01:30
});
