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

// Visti su DAOP (2026-10-15)
test("scarta corsi per neogenitori e attività per neonati", () => {
  for (const e of [
    ev("Guida pratica al neonato", "Movida Bar", "Incontro gratuito per gestanti e neomamme con una guida pratica alla cura del neonato."),
    ev("Post parto: salute pelvica e addominale"),
    ev("Massaggio infantile A.I.M.I. - Centro per le Famiglie", null, "Corso per genitori di bimbi 0-12 mesi."),
    ev("Essere genitori, che fatica", null, "Incontro di gruppo con lo psicologo sul tema della genitorialità."),
    ev("Non siamo d'accordo: conflitti in famiglia", null, "Incontro per genitori con la Dott.ssa Nigra."),
    ev("Consulenza educativa - Centro per le Famiglie"),
    ev("Pilates in Gravidanza - CàRezza"),
    ev("Da Mamma a Mamma", null, "Un incontro tra mamme con Roberta Ronco, Custode della Nascita."),
    ev("Bibliobebè con Floriana Lovera - bambini 9-18 mesi", null, "Per bambini dai 9 ai 18 mesi."),
    ev("Favolando", null, "Mini letture per bebè da 0 a 30 mesi."),
    ev("Abitare la Natura", null, "Laboratorio per bambini 0-3 anni."),
    ev("Corso primo soccorso pediatrico - Croce Bianca Fossano"),
    ev("Sicurezza e Benessere Neonato: Sportello Ostetrico e Psico-Educativo"),
    ev("I Patti Digitali di Comunità e la promozione delle alleanze genitoriali"),
    ev("Multisensoriale in Biblioteca - genitori e bambini 1-3 anni"),
  ]) {
    assert.ok(exclusionReason(e), `doveva escludere: ${e.title}`);
  }
});

test("tiene sagre, feste per bambini e frasi come «da 0 a 99 anni»", () => {
  for (const e of [
    ev("Festa di Halloween - Centro per le Famiglie", null, "Festa di Halloween per bambini e famiglie: vieni mascherato!"),
    ev("Fiera del Rapulé", null, "Ingresso libero, per tutti da 0 a 99 anni."),
    ev("Letture per bambini - mamma Isa", null, "Letture per bambini a cura di mamme, nonne e maestre del territorio."),
    ev("Il neonato collettivo teatrale in scena"),
    ev("Laboratorio per ragazzi 8-12 anni"),
    ev("Biblioteca 0-18: un tè tra gli scaffali"),
  ]) {
    assert.equal(exclusionReason(e), null, `non doveva escludere: ${e.title}`);
  }
});
