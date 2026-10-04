import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

test("la receta lista a la izquierda solo medicamento, concentración y cantidad", () => {
  assert.match(app, /function recetaLineasListado\(/);
  assert.match(app, /function recetaLineasIndicaciones\(/);
  assert.match(app, /\$\{index \+ 1\}\. \$\{med\.nombre\}  \$\{med\.cantidad\}/);
  assert.match(app, /textoAdaptado\(doc, recetaLineasListado\(\)/);
  assert.match(app, /textoAdaptado\(doc, recetaLineasIndicaciones\(\)/);
  const listado = app.slice(app.indexOf("function recetaLineasListado"), app.indexOf("function recetaLineasMedicamentos"));
  assert.doesNotMatch(listado, /med\.dosis/);
  assert.doesNotMatch(listado, /med\.frecuencia/);
  assert.doesNotMatch(listado, /med\.indicaciones/);
});

test("las indicaciones de la receta llevan toma, horario y recomendaciones", () => {
  const bloque = app.slice(app.indexOf("function recetaLineasIndicaciones"), app.indexOf("function paletaDocumento"));
  assert.match(bloque, /med\.via/);
  assert.match(bloque, /med\.dosis/);
  assert.match(bloque, /med\.frecuencia/);
  assert.match(bloque, /med\.duracion/);
  assert.match(bloque, /med\.indicaciones/);
  assert.match(bloque, /Recomendaciones/);
  assert.match(bloque, /recetaLineasNotas/);
});

test("laboratorio e imagen se emiten por separado en un cuarto de A4", () => {
  assert.match(app, /const ANCHO_ORDEN = 105/);
  assert.match(app, /const ALTO_ORDEN = 148.5/);
  assert.match(app, /¼ A4 vertical/);
  assert.match(app, /function dibujarOrdenCuarto\(/);
  assert.match(app, /function generarOrdenLaboratorio\(/);
  assert.match(app, /function generarOrdenImagenes\(/);
  assert.match(app, /function productosCompletos\(/);
  assert.match(app, /Orden_laboratorio_/);
  assert.match(app, /Orden_imagenes_/);
});

test("previa y generar son iconos según el producto completado", () => {
  assert.match(app, /function docAction\(/);
  assert.match(app, /class: "doc-actions"/);
  assert.match(app, /docAction\("eye", "Vista previa"/);
  assert.match(app, /docAction\("doc", busy \? "Generando…" : "Generar receta"/);
  assert.match(app, /docAction\("flask"/);
  assert.match(app, /docAction\("layers"/);
  assert.match(css, /\.doc-action/);
  assert.match(css, /\.preview-mark/);
  assert.match(css, /\.preview-header-end/);
});
