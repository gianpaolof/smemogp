import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseComuneDetail, repairJsonLd } from "../src/adapters/custom/comune.ts";
import { inferYear, parseMagazzinoPage } from "../src/adapters/custom/magazzino.ts";
import { maoDetail, parseMaoList } from "../src/adapters/custom/mao.ts";
import { taccoEvents } from "../src/adapters/custom/tacco.ts";
import { tribeToRaw, type TribeEvent } from "../src/adapters/custom/tribe.ts";
import { extractJsonLd } from "../src/adapters/jsonld.ts";
import { timeOnDay } from "../src/lib/itdate.ts";
import { exclusionReason } from "../src/lib/exclude.ts";
import { withDefaultVenue } from "../src/lib/venue.ts";

const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf8");
const OCT_15 = new Date("2026-10-15T10:00:00Z");

test("timeOnDay: solo l'ora del giorno indicato", () => {
  const text = "La prima è lunedì 5 ottobre 2026 alle ore 20.00, replica il 6 ottobre 2026 ore 16:00.";
  assert.equal(timeOnDay(text, "2026-10-05")?.toISOString(), "2026-10-05T18:00:00.000Z");
  assert.equal(timeOnDay(text, "2026-10-06")?.toISOString(), "2026-10-06T14:00:00.000Z");
  assert.equal(timeOnDay(text, "2026-10-07"), null);
});

test("Tacco di Bacco: solo Torino, titolo pulito, ora dalla descrizione", () => {
  const html = fixture("tacco-spettacoli.html");
  const raw = extractJsonLd(html, "https://iltaccodibacco.it/torino/spettacoli/");
  const events = taccoEvents({ cities: ["Torino"] }, raw);
  assert.ok(events.length >= 30, `trovati ${events.length}`);
  assert.ok(events.every((e) => e.city === "Torino"));
  assert.ok(!events.some((e) => /^torino\s*\|/i.test(e.title)));
  const goldoni = events.find((e) => /carnovale/i.test(e.title))!;
  assert.equal(goldoni.startsAt.toISOString(), "2026-10-05T18:00:00.000Z");
  assert.equal(goldoni.allDay, false);
  assert.ok(goldoni.endsAt, "replica fino al 25 ottobre");
  // Il Regio arriva dalla lista: lo scarta exclude.json
  const regio = events.filter((e) => /regio/i.test(e.venueName ?? ""));
  assert.ok(regio.length && regio.every((e) => exclusionReason(e)));
});

test("Tacco di Bacco senza ora: tutto il giorno, a mezzogiorno di Roma", () => {
  const [e] = taccoEvents({}, [
    { title: "Torino | X", startsAt: new Date("2026-10-24"), endsAt: new Date("2026-10-24"), allDay: true, url: "u" },
  ]);
  assert.equal(e.title, "X");
  assert.equal(e.allDay, true);
  assert.equal(e.startsAt.toISOString(), "2026-10-24T10:00:00.000Z");
  assert.equal(e.endsAt, null);
});

test("The Events Calendar: ora locale, prezzo, venue vuoto", () => {
  const { events } = JSON.parse(fixture("tribe-blahblah.json")) as { events: TribeEvent[] };
  const raw = events.map(tribeToRaw);
  assert.equal(raw.length, events.length);
  const first = raw[0];
  assert.equal(first.startsAt.toISOString(), "2026-10-15T19:00:00.000Z");
  assert.equal(first.allDay, false);
  assert.equal(first.priceText, "€10");
  assert.equal(first.venueName, null);
  assert.ok(!/<|&#/.test(first.description ?? ""), "descrizione in testo semplice");
  assert.ok(!raw.some((e) => /&#/.test(e.title)), "entità HTML decodificate");
  // 08:00–17:00 = orario predefinito del plugin, non un concerto alle 8 di mattina
  const pat = raw.find((e) => /PAT TODD/.test(e.title))!;
  assert.equal(pat.allDay, true);
  assert.equal(pat.endsAt, null);
});

test("Magazzino sul Po: data senza anno, prezzo, ingresso libero", () => {
  const events = parseMagazzinoPage(fixture("magazzino-list.html"), OCT_15);
  assert.equal(events.length, 15);
  const genn = events.find((e) => /ENN/.test(e.title))!;
  assert.equal(genn.startsAt.toISOString(), "2026-10-16T19:00:00.000Z");
  assert.equal(genn.priceText, "8,00 €");
  assert.equal(events[0].priceText, "Gratis");
  assert.equal(inferYear(1, OCT_15), 2027);
  assert.equal(inferYear(9, OCT_15), 2026);
});

test("MAO: schede della lista, mostre con intervallo", () => {
  const events = parseMaoList(fixture("mao-list.html"));
  assert.equal(events.length, 19);
  const mostra = events.find((e) => /Declinazioni/.test(e.title))!;
  assert.equal(mostra.category, "mostre");
  assert.ok(mostra.endsAt && mostra.endsAt > mostra.startsAt);
  assert.ok(events.every((e) => e.venueName && e.url.startsWith("https://www.maotorino.it/")));
});

test("MAO: ora dal dettaglio, luogo del museo invariato", () => {
  const kaka = parseMaoList(fixture("mao-list.html")).find((e) => e.title === "KAKA")!;
  const e = maoDetail(fixture("mao-detail.html"), kaka);
  assert.equal(e.startsAt.toISOString(), "2026-10-31T17:00:00.000Z");
  assert.equal(e.allDay, false);
  assert.equal(e.venueName, kaka.venueName);
});

test("sede predefinita: solo se manca, e titolo senza il nome del locale", () => {
  const venue = { venueName: "Imbarchino", address: "Viale Umberto Cagni 37, Torino", city: "Torino" };
  const base = { title: "Tavoli Linguistici — Imbarchino", startsAt: new Date(), url: "u" };
  const filled = withDefaultVenue(base, venue);
  assert.equal(filled.title, "Tavoli Linguistici");
  assert.equal(filled.address, venue.address);
  const elsewhere = withDefaultVenue({ ...base, venueName: "Parco del Valentino" }, venue);
  assert.equal(elsewhere.venueName, "Parco del Valentino");
  assert.equal(elsewhere.address, undefined);
});

test("Comune di Torino: JSON-LD riparato, mostra di più giorni", () => {
  const e = parseComuneDetail(fixture("comune-mostra.html"), "https://eventi.comune.torino.it/calendario/roberto-capucci-vestire-le-muse/")!;
  assert.equal(e.title, "Roberto Capucci. Vestire LE muse");
  assert.equal(e.category, "mostre");
  assert.equal(e.allDay, true);
  assert.equal(e.startsAt.toISOString(), "2026-11-06T11:00:00.000Z");
  assert.equal(e.endsAt?.toISOString(), "2027-02-28T22:59:00.000Z");
  assert.equal(e.venueName, "Fondazione Accorsi Ometto");
  assert.match(e.address ?? "", /via Po, 55/);
});

test("Comune di Torino: l'ora «UTC» del sito è ora di Torino", () => {
  const e = parseComuneDetail(fixture("comune-conferenza.html"), "https://eventi.comune.torino.it/calendario/x/")!;
  assert.match(e.title, /^Narrare la natura/);
  assert.equal(e.allDay, false);
  assert.equal(e.startsAt.toISOString(), "2026-10-22T16:00:00.000Z");
  assert.equal(e.endsAt?.toISOString(), "2026-10-22T17:30:00.000Z");
  assert.equal(e.category, undefined);
  assert.equal(e.venueName, "Museo Regionale di Scienze Naturali");
});

test("repairJsonLd: virgola finale e date PHP", () => {
  const html = `<script type="application/ld+json">{"@type":"Event","name":"X","startDate":{"date":"2026-10-22 00:00:00.000000","timezone":"UTC"},"organizer":{"name":"Y",}}</script>`;
  assert.equal(extractJsonLd(repairJsonLd(html), "https://e.it/").length, 1);
});
