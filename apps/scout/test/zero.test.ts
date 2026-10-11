import { test } from "node:test";
import assert from "node:assert/strict";
import { zeroToRaw } from "../src/adapters/custom/zero.ts";

const base = {
  name: { plain: 'Carlo Mazza Galanti - "K-Hole"' },
  link: "https://zero.eu/it/eventi/380771-carlo-mazza-galanti-k-hole-via-baltea,torino/",
  start_date: "2026-10-17",
  end_date: "2026-10-17",
  start_time: "18:30",
  price: "free",
  venue_name: "Via Baltea 3",
  venue_coords: { lat: 45.091271, lng: 7.689942 },
};

test("evento con orario e coordinate (dati reali API)", () => {
  const e = zeroToRaw(base);
  assert.equal(e.startsAt.toISOString(), "2026-10-17T16:30:00.000Z");
  assert.equal(e.allDay, false);
  assert.equal(e.endsAt, null);
  assert.equal(e.priceText, "Gratis");
  assert.equal(e.lat, 45.091271);
});

test("senza orario e su più giorni", () => {
  const e = zeroToRaw({ ...base, start_time: "", start_date: "2026-10-29", end_date: "2026-11-01" });
  assert.equal(e.allDay, true);
  assert.equal(e.endsAt?.toISOString(), "2026-11-01T22:59:00.000Z");
});
