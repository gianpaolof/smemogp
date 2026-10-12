import { test } from "node:test";
import assert from "node:assert/strict";
import { safeExternalUrl } from "./format";

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
