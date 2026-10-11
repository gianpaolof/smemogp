import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseId, findMatch, titleSimilarity, type Comparable } from "../src/lib/dedup.ts";
import { eventId } from "../src/lib/normalize.ts";

const at = (iso: string) => new Date(iso);
const row = (o: Partial<Comparable> & Pick<Comparable, "title" | "startsAt">): Comparable => ({
  endsAt: null,
  venueName: null,
  city: null,
  lat: null,
  lng: null,
  ...o,
  id: o.id ?? eventId(o),
});

test("titoli simili tra fonti", () => {
  assert.ok(titleSimilarity("Concerto di Vinicio Capossela", "Vinicio Capossela - Torino") >= 0.6);
  assert.ok(titleSimilarity("Brunori Sas in concerto", "Brunori Sas – Tour 2026") >= 0.6);
  assert.ok(titleSimilarity("Vinicio Capossela", "Brunori Sas") < 0.3);
  // Una sola parola in comune su tre non basta
  assert.ok(titleSimilarity("Notte bianca Salone Libro", "Notte di musica elettronica") < 0.6);
});

test("stesso concerto: Eventbrite con orario e TorinoToday senza città → stesso id", () => {
  const eb = row({ title: "Vinicio Capossela live", startsAt: at("2026-10-17T19:00:00Z"), venueName: "Hiroshima Mon Amour", city: "Torino", lat: 45.04, lng: 7.66 });
  const tt = row({ title: "Vinicio Capossela Live a Torino", startsAt: at("2026-10-17T00:00:00Z"), venueName: null });
  assert.equal(findMatch(tt, [eb])?.id, eb.id);
  assert.deepEqual(chooseId(tt, [eb]), { id: eb.id, merged: eb.id !== tt.id });
});

test("mostra su più giorni da due fonti → stesso id", () => {
  const egizio = row({ title: "Ultrasky", startsAt: at("2026-10-13T10:00:00Z"), endsAt: at("2026-12-14T10:00:00Z"), venueName: "Museo Egizio" });
  const zero = row({ title: "Mostra Ultrasky", startsAt: at("2026-10-20T10:00:00Z"), venueName: "Museo Egizio, Torino" });
  assert.equal(findMatch(zero, [egizio])?.id, egizio.id);
});

test("omonimi stesso giorno in città lontane restano distinti", () => {
  const torino = row({ title: "Festa d'autunno", startsAt: at("2026-10-18T08:00:00Z"), venueName: "Piazza Vittorio", city: "Torino", lat: 45.065, lng: 7.695 });
  const alba = row({ title: "Festa d'autunno", startsAt: at("2026-10-18T08:00:00Z"), venueName: "Piazza Duomo", city: "Alba", lat: 44.7, lng: 8.03 });
  assert.equal(findMatch(alba, [torino]), undefined);
  const { id, merged } = chooseId(alba, [torino]);
  assert.equal(merged, false);
  assert.notEqual(id, torino.id);
});

test("eventi diversi stesso posto e giorno non si fondono", () => {
  const a = row({ title: "Jazz trio Rossi", startsAt: at("2026-10-17T19:00:00Z"), venueName: "Jazz Club" });
  const b = row({ title: "Open mic poesia", startsAt: at("2026-10-17T21:00:00Z"), venueName: "Jazz Club" });
  assert.equal(findMatch(b, [a]), undefined);
});
