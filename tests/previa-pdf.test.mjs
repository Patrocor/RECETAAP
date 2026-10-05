import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");

test("la previa construye el PDF real de la hoja, no un HTML aproximado", () => {
  assert.match(app, /function pdfReceta\(/);
  assert.match(app, /function pdfOrden\(/);
  assert.match(app, /function montarHojasPreviasPdf\(/);
  assert.match(app, /function pintarPdfEnHoja\(/);
  assert.match(app, /hojaCompleta: false/);
  assert.match(app, /preview-pdf-frame/);
  assert.match(app, /preview-pdf-canvas/);
  assert.match(app, /pdfjsLib/);
  assert.doesNotMatch(app, /function previewPapelOrden\(/);
  assert.doesNotMatch(app, /function previewEncabezado\(/);
});

test("el PDF reservado deja pie para firma y guía de corte en A4", () => {
  assert.match(app, /const PIE_RECETA = 26/);
  assert.match(app, /const PIE_ORDEN = 28/);
  assert.match(app, /function dibujarGuiasCorte\(/);
  assert.match(app, /pdfReceta\(\{ hojaCompleta: true \}\)/);
  assert.match(app, /pdfOrden\(tipo, items, \{ hojaCompleta: true \}\)/);
});

test("CSP y cache permiten blob de previa y pdf.js", () => {
  assert.match(html, /frame-src 'self' blob:/);
  assert.match(html, /object-src 'self' blob:/);
  assert.match(html, /pdf\.js\/3\.11\.174\/pdf\.min\.js/);
  assert.match(sw, /recetapp-v11/);
  assert.match(sw, /pdf\.js\/3\.11\.174\/pdf\.min\.js/);
  assert.match(css, /\.preview-pdf-sheet/);
  assert.match(css, /\.preview-pdf-stage/);
  assert.match(css, /aspect-ratio: 210 \/ 148\.5/);
  assert.match(css, /aspect-ratio: 105 \/ 148\.5/);
});
