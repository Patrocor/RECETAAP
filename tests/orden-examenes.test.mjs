import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { examenesCatalogo } from "../catalogos.js";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("la receta y la orden de exámenes son flujos separados", () => {
  assert.doesNotMatch(app, /fold\("examenes"/);
  assert.match(app, /Solicitar exámenes/);
  assert.match(app, /function generarOrdenExamenes\(\)/);
  assert.match(app, /Orden_examenes_/);
  assert.doesNotMatch(app, /Examen: \$\{ex\.nombre\}/);
});

test("cada examen ofrece tipo, grupo y preparación", () => {
  assert.ok(examenesCatalogo.length >= 280);
  for (const examen of examenesCatalogo) {
    assert.ok(["Laboratorio", "Imágenes", "Procedimientos"].includes(examen.tipo), examen.nombre);
    assert.ok(examen.grupo, examen.nombre);
    assert.ok(examen.indicacionesSug, examen.nombre);
  }
});
