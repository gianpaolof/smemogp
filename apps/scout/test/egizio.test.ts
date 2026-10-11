import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  egizioAdapter,
  parseAppointmentsPage,
  parseEgizio,
  parseExhibitionsPage,
  parseNextData,
} from "../src/adapters/custom/egizio.ts";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const appHtml = fixture("egizio-appuntamenti.html");
const mostreHtml = fixture("egizio-mostre.html");
const NOW = new Date("2026-10-11T10:00:00Z");

test("parseNextData trova le props nello script inline", () => {
  const data = parseNextData(appHtml);
  assert.ok(data && typeof data.props === "object");
  assert.equal(parseNextData("<html>niente</html>"), null);
});

test("listing: appuntamenti (+ highlighted, dedup) e mostre", () => {
  const app = parseAppointmentsPage(appHtml);
  assert.equal(app.length, 6);
  assert.equal(new Set(app.map((a) => a.slug)).size, 6);
  assert.equal(parseExhibitionsPage(mostreHtml).length, 10);
});

test("parseEgizio: solo futuri/in corso, date e categorie", async () => {
  const data = { appointments: parseAppointmentsPage(appHtml), exhibitions: parseExhibitionsPage(mostreHtml) };
  const events = parseEgizio(data, NOW);
  assert.equal(events.length, 6);
  const by = (slug: string) => events.find((e) => e.url.includes(`/${slug}/`))!;

  const ultra = by("ultrasky-alla-scoperta-del-blu-egizio-dalle-arti-alle-scienze");
  assert.equal(ultra.category, "mostre");
  assert.equal(ultra.allDay, true);
  assert.equal(ultra.startsAt.toISOString(), "2026-10-13T00:00:00.000Z");
  assert.equal(ultra.endsAt?.toISOString(), "2026-12-14T00:00:00.000Z");
  assert.match(ultra.imageUrl ?? "", /^https:\/\/api\.museoegizio\.it\//);

  // ora "a muro" di Torino -> istante reale (CEST)
  const notte = by("notte-bianca-al-museo-egizio");
  assert.equal(notte.allDay, false);
  assert.equal(notte.startsAt.toISOString(), "2026-10-17T18:00:00.000Z");
  assert.equal(notte.title, "Notte Bianca al Museo Egizio");
  assert.equal(notte.venueName, "Museo Egizio");
  assert.equal(notte.lat, 45.0684);

  // dopo il cambio d'ora (CET)
  assert.equal(by("archaeology-in-reverse").startsAt.toISOString(), "2026-10-31T17:00:00.000Z");

  const onde = by("13319");
  assert.equal(onde.category, "musica");
  assert.equal(onde.startsAt.toISOString(), "2026-10-18T09:00:00.000Z");
  assert.match(onde.description ?? "", /Domenica 18 ottobre 2026 alle 11/);
  assert.doesNotMatch(onde.description ?? "", /<|&amp;/);

  assert.equal(by("the-digger-somniculus-petrified").category, "cinema");
  assert.equal(events.some((e) => e.url.includes("onde-20-settembre")), false); // passato
});

test("extract legge il body JSON prodotto da fetch", async () => {
  const body = JSON.stringify({ appointments: parseAppointmentsPage(appHtml), exhibitions: [] });
  const events = await egizioAdapter.extract({ id: "egizio", name: "Museo Egizio", url: "", format: "html" }, { url: "", body });
  assert.ok(events.every((e) => e.startsAt instanceof Date && e.url.startsWith("https://www.museoegizio.it/")));
});
