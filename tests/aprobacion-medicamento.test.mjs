import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

test("el check para agregar el medicamento está junto a la cantidad calculada", () => {
  assert.match(app, /function cantidadField\(/);
  assert.match(app, /class: "cantidad-row"/);
  assert.match(app, /class: "icon-add med-cantidad-check"/);
  assert.match(app, /onclick: commitMed/);
  assert.match(css, /\.cantidad-row/);
  assert.match(css, /\.med-cantidad-check/);
  assert.match(app, /if \(composer === "med"\) \{\s*return el\("footer"/);
  assert.match(app, /\["Cancelar"\]/);
});

test("la receta PDF es un solo ejemplar de media página A4", () => {
  assert.match(app, /const alto = 142/);
  assert.match(app, /dibujarReceta\(doc, 8, alto\)/);
  assert.doesNotMatch(app, /dibujarReceta\(doc, 150/);
  assert.match(app, /Media página A4 · un solo ejemplar/);
});

test("hay tres modelos de receta seleccionables", () => {
  assert.match(app, /id: "clasica"/);
  assert.match(app, /id: "lineal"/);
  assert.match(app, /id: "institucional"/);
  assert.match(app, /function dibujarRecetaClasica\(/);
  assert.match(app, /function dibujarRecetaLineal\(/);
  assert.match(app, /function dibujarRecetaInstitucional\(/);
  assert.match(app, /function selectorModeloReceta\(/);
  assert.match(app, /modeloReceta/);
  assert.match(css, /\.receta-modelo-card/);
});

test("el aviso de cargar esquema previo se oculta después de cargar", () => {
  assert.match(app, /esquemaPrevioCargado/);
  assert.match(app, /aviso-esquema-previo/);
  assert.match(app, /draft\.esquemaPrevioCargado = clavePrevia/);
  assert.match(app, /draft\.esquemaPrevioCargado !== clavePrevia/);
});

test("el PDF clásico usa un diseño premium sin marca de agua LR", () => {
  assert.match(app, /const oro = \[184, 149, 92\]/);
  assert.match(app, /RECETA MÉDICA/);
  assert.doesNotMatch(app, /doc\.setFontSize\(36\);/);
});
