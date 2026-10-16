import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createDb, deletedEvents, eventSources, events } from "@smemogp/db";
import { restoreArchived, snapshot } from "../src/lib/archive.ts";
import { isClosedSocket, persistEvents } from "../src/lib/persist.ts";
import type { RawEvent } from "../src/types.ts";

const migrationsFolder = fileURLToPath(new URL("../../../packages/db/migrations", import.meta.url));

async function freshDb() {
  const db = createDb("file::memory:");
  await migrate(db, { migrationsFolder });
  return db;
}

const nextSaturday = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + ((6 - d.getUTCDay() + 7) % 7 || 7));
  return d.toISOString().slice(0, 10);
};

test("stesso concerto da Eventbrite (con ora) e TorinoToday (solo data) → 1 evento, 2 provenienze", async () => {
  const db = await freshDb();
  const day = nextSaturday();

  // Prima la fonte povera: solo data, niente luogo
  const tt: RawEvent[] = [{ title: "Vinicio Capossela Live a Torino", startsAt: new Date(day), allDay: true, url: "https://www.torinotoday.it/eventi/musica/capossela.html" }];
  await persistEvents(db, { id: "torinotoday" }, tt);

  const eb: RawEvent[] = [
    {
      title: "Vinicio Capossela live",
      startsAt: new Date(`${day}T21:00:00+01:00`),
      allDay: false,
      venueName: "Hiroshima Mon Amour",
      city: "Torino",
      lat: 45.04,
      lng: 7.66,
      url: "https://www.eventbrite.it/e/capossela-1",
    },
  ];
  // Titoli normalizzati identici («… live a Torino» → «… live»): stesso id già di base
  await persistEvents(db, { id: "eventbrite-torino" }, eb);

  const all = await db.select().from(events).all();
  assert.equal(all.length, 1);
  assert.equal(all[0].allDay, false, "l'orario vince sul tutto il giorno");
  assert.equal(all[0].startsAt.getTime(), eb[0].startsAt.getTime());
  assert.equal(all[0].venueName, "Hiroshima Mon Amour");

  const prov = await db.select().from(eventSources).all();
  assert.deepEqual(prov.map((p) => p.sourceId).sort(), ["eventbrite-torino", "torinotoday"]);
});

test("titoli diversi ma stesso evento → fuso sull'id esistente", async () => {
  const db = await freshDb();
  const day = nextSaturday();
  const at21 = new Date(`${day}T21:00:00+01:00`);
  const base = { startsAt: at21, venueName: "Folk Club", city: "Torino", lat: 45.07, lng: 7.68 };
  await persistEvents(db, { id: "a" }, [{ ...base, title: "Brunori Sas in concerto", url: "https://a.it/1" }]);
  const { stats } = await persistEvents(db, { id: "b" }, [{ ...base, title: "Brunori Sas – Tour 2026", url: "https://b.it/1" }]);
  assert.equal(stats.merged, 1);
  assert.equal((await db.select().from(events).all()).length, 1);
  assert.equal((await db.select().from(eventSources).all()).length, 2);
});

test("mostra aperta da mesi e ancora in corso → fusa, non duplicata", async () => {
  const db = await freshDb();
  const day = (offset: number) => new Date(Date.now() + offset * 24 * 3600 * 1000);
  const place = { venueName: "Camera", city: "Torino", lat: 45.07, lng: 7.68, allDay: true };
  // Già in DB da un'altra fonte: aperta 120 giorni fa, chiude tra 90
  await persistEvents(db, { id: "a" }, [{ ...place, title: "Letizia Battaglia", startsAt: day(-120), endsAt: day(90), url: "https://a.it/1" }]);
  // La biglietteria la vende da oggi
  const { stats } = await persistEvents(db, { id: "b" }, [
    { ...place, title: "LETIZIA BATTAGLIA. L'OPERA: 1970-2020", startsAt: day(0), endsAt: day(90), url: "https://b.it/1" },
  ]);
  assert.equal(stats.merged, 1);
  assert.equal((await db.select().from(events).all()).length, 1);
});

const closedSocket = () => new TypeError("fetch failed", { cause: Object.assign(new Error("other side closed"), { code: "UND_ERR_SOCKET" }) });

test("connessione chiusa: riconosciuta lungo la catena cause, non altri errori", () => {
  assert.ok(isClosedSocket(closedSocket()));
  assert.ok(isClosedSocket(new Error("Failed query", { cause: closedSocket() })));
  assert.ok(!isClosedSocket(new Error("SQLITE_CONSTRAINT")));
  assert.ok(!isClosedSocket(undefined));
});

test("blocco su connessione chiusa: un nuovo tentativo con le stesse istruzioni", async (t) => {
  const db = await freshDb();
  const batch = db.batch.bind(db);
  const calls: unknown[] = [];
  t.mock.method(console, "warn", () => {});
  t.mock.method(db, "batch", async (queries: Parameters<typeof db.batch>[0]) => {
    calls.push(queries);
    if (calls.length === 1) throw closedSocket();
    return batch(queries);
  });
  const event = { title: "Concerto", startsAt: new Date(`${nextSaturday()}T21:00:00+01:00`), allDay: false, url: "https://a.it/1" };
  await persistEvents(db, { id: "a" }, [event]);
  assert.equal(calls.length, 2);
  assert.equal(calls[0], calls[1], "stesso batch: dati, id e timestamp identici");
  assert.equal((await db.select().from(events).all()).length, 1);
  assert.equal((await db.select().from(eventSources).all()).length, 1);
});

test("blocco: secondo fallimento o errore diverso si propagano", async (t) => {
  const db = await freshDb();
  t.mock.method(console, "warn", () => {});
  const event = { title: "Concerto", startsAt: new Date(`${nextSaturday()}T21:00:00+01:00`), allDay: false, url: "https://a.it/1" };
  const always = t.mock.method(db, "batch", async () => { throw closedSocket(); });
  await assert.rejects(persistEvents(db, { id: "a" }, [event]), /fetch failed/);
  assert.equal(always.mock.callCount(), 2);
  always.mock.restore();
  const other = t.mock.method(db, "batch", async () => { throw new Error("SQLITE_CONSTRAINT"); });
  await assert.rejects(persistEvents(db, { id: "a" }, [event]), /SQLITE_CONSTRAINT/);
  assert.equal(other.mock.callCount(), 1);
});

test("esclusi e passati non vengono salvati; dry-run non scrive", async () => {
  const db = await freshDb();
  const day = nextSaturday();
  const raw: RawEvent[] = [
    { title: "La Traviata", description: "Opera lirica in tre atti", startsAt: new Date(day), url: "https://x.it/1", lat: 45, lng: 7 },
    { title: "Concerto passato", startsAt: new Date("2020-01-01"), url: "https://x.it/2", lat: 45, lng: 7 },
    { title: "Mostra: l'opera di Kusama", startsAt: new Date(day), url: "https://x.it/3", lat: 45, lng: 7 },
  ];
  const dry = await persistEvents(db, { id: "t" }, raw, { dryRun: true });
  assert.deepEqual(dry.stats, { saved: 1, merged: 0, excluded: 1, stale: 0, past: 1 });
  assert.equal((await db.select().from(events).all()).length, 0);

  await persistEvents(db, { id: "t" }, raw);
  const saved = await db.select().from(events).all();
  assert.deepEqual(saved.map((e) => e.title), ["Mostra: l'opera di Kusama"]);
  assert.equal(saved[0].category, "mostre");
});

test("evento già salvato che ora va escluso → archiviato e rimosso; ripristino fedele", async () => {
  const db = await freshDb();
  const day = nextSaturday();
  const base = { title: "Spettacolo della tartaruga", startsAt: new Date(`${day}T16:00:00+01:00`), venueName: "Teatro Nuovo", city: "Torino", lat: 45.05, lng: 7.68 };
  await persistEvents(db, { id: "a" }, [{ ...base, url: "https://a.it/1" }]);
  await persistEvents(db, { id: "b" }, [{ ...base, url: "https://b.it/1" }]);
  const before = await snapshot(db, (await db.select().from(events).all()).map((e) => e.id));
  assert.equal(before[0].sources.length, 2);

  const update = [{ ...base, description: "Spettacolo musicale per bambini", url: "https://a.it/1" }];
  // Stesso evento ma da un URL mai visto per questa fonte: non si tocca
  const other = await persistEvents(db, { id: "a" }, [{ ...update[0], url: "https://a.it/2" }], { dryRun: true });
  assert.equal(other.stats.stale, 0);

  // Trovato ma non cancellato: in dry-run e finché la cancellazione non è attiva
  for (const opts of [{ dryRun: true, removeStale: true }, { removeStale: false }]) {
    const { stats } = await persistEvents(db, { id: "a" }, update, opts);
    assert.equal(stats.stale, 1);
    assert.equal((await db.select().from(events).all()).length, 1);
  }

  const { stats } = await persistEvents(db, { id: "a" }, update, { removeStale: true });
  assert.deepEqual(stats, { saved: 0, merged: 0, excluded: 1, stale: 1, past: 0 });
  assert.equal((await db.select().from(events).all()).length, 0);
  assert.equal((await db.select().from(eventSources).all()).length, 0);

  const [archived] = await db.select().from(deletedEvents).all();
  assert.match(archived.reason, /testo:/);
  await restoreArchived(db, archived.payload);
  assert.deepEqual(await snapshot(db, [before[0].event.id]), before);
});
