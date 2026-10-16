import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { vivaticketAdapter, vivaticketEvents } from "../src/adapters/custom/vivaticket.ts";
import { adapterFor } from "../src/adapters/index.ts";
import { exclusionReason } from "../src/lib/exclude.ts";
import { readCatalog } from "../src/lib/sources.ts";

const fixture = () => JSON.parse(readFileSync(new URL("fixtures/vivaticket-carnevale.json", import.meta.url), "utf8"));
const url = "https://www.vivaticket.com/it/ticket/una-delle-ultime-sere-di-carnevale/304305";

test("Vivaticket: nove repliche reali, ora legale/solare, sede e nessun intervallo inventato", () => {
  const events = vivaticketEvents(fixture(), url);
  assert.equal(events.length, 9);
  assert.equal(events[0].startsAt.toISOString(), "2026-10-16T18:45:00.000Z");
  assert.equal(events[8].startsAt.toISOString(), "2026-10-25T15:00:00.000Z");
  assert.equal(events[0].venueName, "Teatro Carignano");
  assert.equal(events[0].lat, 45.0692786);
  assert.equal(events[0].category, "teatro");
  assert.ok(events.every(e => e.url === url && !e.endsAt && !e.allDay && !e.priceText));
});

test("Vivaticket: provincia verificata sul dettaglio, anche fuori città", () => {
  const data = fixture();
  data.infoEvent.venueDetail.city = "VENARIA REALE";
  assert.equal(vivaticketEvents(data, url)[0].city, "VENARIA REALE");
  data.infoEvent.venueDetail.provinceCode = "MI";
  assert.deepEqual(vivaticketEvents(data, url), []);
});

test("Vivaticket: descrizione HTML e genere arrivano ai filtri condivisi", () => {
  const data = fixture();
  data.infoEvent.eventDetail.description = "<p>Laboratorio gratuito per bambini</p>";
  let [event] = vivaticketEvents(data, url);
  assert.ok(exclusionReason(event));
  assert.ok(!event.description?.includes("<p>"));
  data.infoEvent.eventDetail.description = "";
  for (const genre of ["Lirica", "Operetta"]) {
    data.infoEvent.eventDetail.subCategoryName = genre;
    [event] = vivaticketEvents(data, url);
    assert.ok(exclusionReason(event), genre);
  }
});

test("Vivaticket: non inventa repliche, rifiuta payload e date invalidi, elimina duplicati", () => {
  const data = fixture();
  data.infoPerformance.performances.push(data.infoPerformance.performances[0]);
  assert.equal(vivaticketEvents(data, url).length, 9);
  data.infoPerformance.performances[0].datetime = "2026-02-30T20:45:00";
  assert.throws(() => vivaticketEvents(data, url), /data non valida/);
  data.infoPerformance.performances = [{ datetime: "", title: "Pagina generale" }];
  assert.deepEqual(vivaticketEvents(data, url), []);
  data.infoPerformance.performances = [];
  assert.deepEqual(vivaticketEvents(data, url), []);
  assert.throws(() => vivaticketEvents({}, url));
});

test("Vivaticket: catalogo, dispatch, paginazione e dettagli senza abbonamenti", async (t) => {
  const source = (await readCatalog()).find(s => s.id === "vivaticket-torino")!;
  assert.equal(adapterFor(source), vivaticketAdapter);
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: string) => {
    calls.push(input);
    const data = input.includes("/Search/1/")
      ? { items: [{ id: "304305", slug: "carnevale", typology: "ticket", ticketTypeId: "0" }], totalItems: 2 }
      : input.includes("/Search/2/")
        ? { items: [{ id: "1", slug: "abbonamento", typology: "ticket", ticketTypeId: "1" }], totalItems: 2 }
        : fixture();
    return new Response(JSON.stringify(data));
  });
  const content = await vivaticketAdapter.fetch!(source);
  assert.equal((await vivaticketAdapter.extract(source, content)).length, 9);
  assert.equal(calls.length, 3);
  assert.ok(calls.slice(0, 2).every(u => u.includes("provinceCode=TO") && !u.includes("q=")));
});

test("Vivaticket: errore dettaglio non diventa un catalogo vuoto riuscito", async (t) => {
  const source = (await readCatalog()).find(s => s.id === "vivaticket-torino")!;
  t.mock.method(globalThis, "fetch", async (input: string) => input.includes("/Search/")
    ? new Response(JSON.stringify({ items: [{ id: "304305", slug: "carnevale", typology: "ticket", ticketTypeId: "0" }], totalItems: 1 }))
    : new Response("unavailable", { status: 503 }));
  await assert.rejects(vivaticketAdapter.fetch!(source), /nessun dettaglio leggibile/);
});

test("Vivaticket: pagina vuota prima del totale segnala catalogo incompleto", async (t) => {
  const source = (await readCatalog()).find(s => s.id === "vivaticket-torino")!;
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ items: [], totalItems: 1 })));
  await assert.rejects(vivaticketAdapter.fetch!(source), /paginazione incompleta/);
});

test("Vivaticket: una scheda guasta non perde gli altri eventi", async (t) => {
  const source = (await readCatalog()).find(s => s.id === "vivaticket-torino")!;
  const warnings: unknown[] = [];
  t.mock.method(console, "warn", (message: unknown) => warnings.push(message));
  t.mock.method(globalThis, "fetch", async (input: string) => new Response(input.includes("/Search/")
    ? JSON.stringify({ items: [{ id: "1", slug: "guasta", typology: "ticket", ticketTypeId: "0" }, { id: "304305", slug: "carnevale", typology: "ticket", ticketTypeId: "0" }], totalItems: 2 })
    : input.includes("/Event/1/") ? "" : JSON.stringify(fixture())));
  const content = await vivaticketAdapter.fetch!(source);
  assert.equal((await vivaticketAdapter.extract(source, content)).length, 9);
  assert.equal(warnings.length, 1);
});

test("Vivaticket: una data anomala scarta solo la sua scheda", async (t) => {
  const source = (await readCatalog()).find(s => s.id === "vivaticket-torino")!;
  const warnings: unknown[] = [];
  t.mock.method(console, "warn", (message: unknown) => warnings.push(message));
  const broken = fixture();
  broken.infoPerformance.performances[0].datetime = "2026-10-16T20:45:00.000Z";
  const body = JSON.stringify([{ url: `${url}?rotta`, detail: broken }, { url, detail: fixture() }]);
  const events = await vivaticketAdapter.extract(source, { url: source.url, body });
  assert.equal(events.length, 9);
  assert.ok(events.every(e => e.url === url));
  assert.equal(warnings.length, 1);
});

test("Vivaticket: mostra di ottobre = un evento in corso il 16, non uno per ingresso", () => {
  const data = fixture();
  Object.assign(data.infoEvent.eventDetail, { categoryName: "Arte", subCategoryName: "Mostre",
    startDate: "2026-10-01T10:00:00", endDate: "2026-10-31T18:00:00" });
  const events = vivaticketEvents(data, url);
  assert.equal(events.length, 1);
  const [e] = events;
  assert.equal(e.startsAt.toISOString(), "2026-09-30T22:00:00.000Z");
  assert.equal(e.endsAt?.toISOString(), "2026-10-31T22:59:00.000Z");
  assert.equal(e.allDay, true);
  assert.equal(e.category, "mostre");
  const today = new Date("2026-10-16T10:00:00Z");
  assert.ok(e.startsAt < today && e.endsAt! > today);
  data.infoEvent.eventDetail.endDate = "2026-09-01T18:00:00";
  assert.throws(() => vivaticketEvents(data, url), /intervallo mostra non valido/);
});

test("Vivaticket: museo senza intervallo dichiarato usa i giorni degli ingressi; senza date resta escluso", () => {
  const data = fixture();
  Object.assign(data.infoEvent.eventDetail, { categoryName: "Arte", subCategoryName: "Musei", startDate: "", endDate: "" });
  const [event] = vivaticketEvents(data, url);
  assert.equal(event.startsAt.toISOString(), "2026-10-15T22:00:00.000Z");
  assert.equal(event.endsAt?.toISOString(), "2026-10-25T22:59:00.000Z");
  assert.equal(vivaticketEvents(data, url).length, 1);
  data.infoPerformance.performances = [{ datetime: "", title: "Museo" }];
  assert.deepEqual(vivaticketEvents(data, url), []);
});

test("Vivaticket: visita ogni giorno per tre mesi = un evento a intervallo, non una riga per ingresso", () => {
  const data = fixture();
  data.infoPerformance.performances = Array.from({ length: 80 }, (_, i) =>
    ({ datetime: new Date(Date.UTC(2026, 9, 17 + i, 9, 30)).toISOString().slice(0, 19) }));
  Object.assign(data.infoEvent.eventDetail, { categoryName: "Altri eventi", subCategoryName: "Altri eventi",
    startDate: "2026-10-17T09:30:00", endDate: "2027-01-04T09:30:00" });
  const events = vivaticketEvents(data, url);
  assert.equal(events.length, 1);
  assert.equal(events[0].allDay, true);
  assert.equal(events[0].category, "altro");
  assert.equal(events[0].endsAt?.toISOString(), "2027-01-04T22:59:00.000Z");
});

test("Vivaticket: esclude Sport, Opera e balletto, Musica tramite categoria della fonte", () => {
  const data = fixture();
  for (const categoryName of ["Sport", "Opera e balletto", "Musica"]) {
    data.infoEvent.eventDetail.categoryName = categoryName;
    assert.deepEqual(vivaticketEvents(data, url), [], categoryName);
  }
  for (const categoryName of ["Teatro", "Arte", "Fiere", "Altri eventi"]) {
    data.infoEvent.eventDetail.categoryName = categoryName;
    assert.equal(vivaticketEvents(data, url).length, 9, categoryName);
  }
});
