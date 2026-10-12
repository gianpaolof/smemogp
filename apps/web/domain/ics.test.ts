import { test } from "node:test";
import assert from "node:assert/strict";
import { toIcs } from "./ics";
import type { EventItem } from "./types";

const base: EventItem = {
  id: "abc",
  title: "Concerto; prova, 1",
  description: "riga 1\nriga 2",
  startsAt: "2026-10-12T19:00:00.000Z",
  endsAt: null,
  allDay: false,
  venueName: "Hiroshima Mon Amour",
  address: "Via Bossoli 83",
  city: "Torino",
  lat: 45.03,
  lng: 7.66,
  category: "musica",
  priceText: null,
  imageUrl: null,
  url: "https://example.org/e",
  sourceId: "x",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  distanceKm: null,
};

test("ics: orari in UTC, testo con escape, CRLF", () => {
  const ics = toIcs(base, base.url, new Date("2026-10-12T08:00:00Z"));
  assert.match(ics, /DTSTART:20261012T190000Z\r\n/);
  assert.match(ics, /DTEND:20261012T210000Z\r\n/);
  assert.match(ics, /SUMMARY:Concerto\; prova\\, 1\r\n/);
  assert.match(ics, /DESCRIPTION:riga 1\\nriga 2\r\n/);
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
});

test("ics: tutto il giorno usa date senza orario, fine esclusiva", () => {
  const ics = toIcs({ ...base, allDay: true, startsAt: "2026-10-11T22:00:00.000Z" }, null, new Date());
  assert.match(ics, /DTSTART;VALUE=DATE:20261012\r\n/);
  assert.match(ics, /DTEND;VALUE=DATE:20261013\r\n/);
  assert.doesNotMatch(ics, /URL:/);
});
