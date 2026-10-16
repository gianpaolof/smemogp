import assert from "node:assert/strict";
import test from "node:test";
import { guessCategory } from "../src/lib/normalize";

// Casi reali sul DB remoto (2026-10-16), finiti in teatro per «spettacoli» nella descrizione
test("guessCategory: il titolo vince sulla descrizione", () => {
  assert.equal(guessCategory("Fiera del Sedano Rosso 2026", "mostra mercato, degustazioni, spettacoli e animazioni"), "food");
  assert.equal(guessCategory("Sagra delle Caldarroste"), "food");
  assert.equal(guessCategory("Il misantropo", "Teatro Prosa"), "teatro");
});

test("guessCategory: le feste per bambini sono famiglie anche con gli spettacoli", () => {
  assert.equal(guessCategory("Halloween ad Hogwarts", "I bambini sono invitati in costume per spettacoli e giochi"), "famiglie");
});
