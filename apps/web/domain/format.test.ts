import { test } from "node:test";
import assert from "node:assert/strict";
import { joinAddress, safeExternalUrl, sourceLabel } from "./format";

test("safeExternalUrl accetta solo http(s) e ricava il dominio", () => {
  assert.deepEqual(safeExternalUrl("https://www.eventbrite.it/e/concerto-123?aff=x"), {
    href: "https://www.eventbrite.it/e/concerto-123?aff=x",
    host: "eventbrite.it",
  });
  assert.equal(safeExternalUrl("http://torino.circololettori.it:8080/x/")?.host, "torino.circololettori.it");
});

test("safeExternalUrl rifiuta schemi pericolosi e URL invalidi", () => {
  for (const bad of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<b>x</b>", "vbscript:x", "/relativo", "non un url", "", null, undefined]) {
    assert.equal(safeExternalUrl(bad), null, String(bad));
  }
});

test("joinAddress toglie le parti ripetute", () => {
  assert.equal(joinAddress("Via Roma 1, Torino, Torino", "Torino"), "Via Roma 1, Torino");
  assert.equal(joinAddress("Piazza Castello", "torino"), "Piazza Castello, torino");
  assert.equal(joinAddress(null, null), null);
});

test("sourceLabel usa il nome della fonte o il dominio", () => {
  assert.equal(sourceLabel("museo-egizio", null), "Museo Egizio");
  assert.equal(sourceLabel("ignota", "https://www.example.org/x"), "example.org");
});
