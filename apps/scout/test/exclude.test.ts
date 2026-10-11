import { test } from "node:test";
import assert from "node:assert/strict";
import { exclusionReason } from "../src/lib/exclude.ts";

const ev = (title: string, venueName: string | null = null, description: string | null = null) => ({
  title,
  venueName,
  description,
});

test("scarta lirica e opera", () => {
  for (const e of [
    ev("La Traviata di Giuseppe Verdi"),
    ev("Gala lirico al Carignano"),
    ev("Recital del soprano Anna Netrebko"),
    ev("Stagione lirica 2026"),
    ev("Opera buffa in piazza"),
    ev("Melodramma in tre atti"),
    ev("Carmen", null, "di Georges Bizet"),
    ev("Concerto sinfonico", "Teatro Regio Torino"),
  ]) {
    assert.ok(exclusionReason(e), `doveva escludere: ${e.title}`);
  }
});

test("tiene «opera» nel senso di opera d'arte e il resto", () => {
  for (const e of [
    ev("Yayoi Kusama: l'opera completa", "OGR Torino"),
    ev("Mostra: le opere di Chagall"),
    ev("Un'opera d'arte al mese", "GAM"),
    ev("Club to Club 2026"),
    ev("Jazz al Folk Club", null, "Live con trio"),
    ev("Sagra della pasta alla norma"),
    ev("Carmen Consoli in concerto"),
    // Visto dal vivo (Museo Egizio, 2026-10-11): il sax soprano non è lirica
    ev("Sax Appeal: classici e colonne sonore", "Museo Egizio", "Quartetto con sax soprano, contralto e tenore"),
  ]) {
    assert.equal(exclusionReason(e), null, `non doveva escludere: ${e.title}`);
  }
});
