import test from "node:test";
import assert from "node:assert/strict";
import { frasesRecomendadas } from "../recomendaciones.js";

test("un antiinflamatorio oral pide tomarlo con alimentos", () => {
  const frases = frasesRecomendadas([
    { nombre: "Ibuprofeno", presentacion: "400 mg tabletas", via: "Vía oral" },
    { nombre: "Diclofenaco sódico", presentacion: "50 mg tabletas", via: "Vía oral" },
  ]);
  assert.ok(frases.includes("Tome con alimentos."));
  assert.ok(frases.includes("No lo combine con otro antiinflamatorio."));
  assert.equal(frases.includes("Aplique una capa delgada sobre la piel limpia y seca."), false);
});

test("el gel no hereda la indicación oral", () => {
  const frases = frasesRecomendadas([
    { nombre: "Diclofenaco gel 1%", presentacion: "50 g gel tópico", via: "Vía tópica" },
  ]);
  assert.ok(frases.includes("Aplique una capa delgada sobre la piel limpia y seca."));
  assert.equal(frases.includes("Tome con alimentos."), false);
});

test("el omeprazol se toma en ayunas", () => {
  const frases = frasesRecomendadas([
    { nombre: "Omeprazol", presentacion: "20 mg cápsulas", via: "Vía oral" },
  ]);
  assert.ok(frases.includes("Tome en ayunas, media hora antes de comer."));
});

test("sin medicamentos ofrece recomendaciones generales", () => {
  const frases = frasesRecomendadas([]);
  assert.ok(frases.includes("No lo use más días de los indicados."));
  assert.ok(frases.includes("Guárdelo fuera del alcance de los niños."));
  assert.equal(frases.includes("Tome con alimentos."), false);
});

test("la búsqueda encuentra la frase de somnolencia", () => {
  const frases = frasesRecomendadas([], "sueño");
  assert.deepEqual(frases, ["Puede dar sueño: no maneje."]);
});
