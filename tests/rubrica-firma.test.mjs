import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

test("el perfil incluye gestión explícita de la rúbrica de la firma e imagen", () => {
  assert.match(app, /Rúbrica de la firma y sello médico/);
  assert.match(app, /Cargar rúbrica de firma o sello/);
  assert.match(app, /Quitar rúbrica/);
  assert.match(app, /rubricaAjuste/);
  assert.match(app, /sanitizeRubricaAjuste/);
});

test("la vista previa permite acomodar la rúbrica (posición d-pad X/Y, escala/zoom y reset)", () => {
  assert.match(app, /previewSignatureBox/);
  assert.match(app, /rubrica-interactive/);
  assert.match(app, /preview-rubrica-stage/);
  assert.match(app, /rubrica-controls-panel/);
  assert.match(app, /Acomodar rúbrica:/);
  assert.match(app, /rubrica-dpad/);
  assert.match(app, /rubrica-zoom-row/);
  assert.match(app, /rubrica-reset-btn/);
  assert.match(app, /transform: translate\(/);
});

test("el botón de aprobar y emitir documento está disponible en la vista previa", () => {
  assert.match(app, /btn-aprobar-documento/);
  assert.match(app, /Aprobar y Emitir Receta/);
  assert.match(app, /Aprobar y Emitir Orden/);
});

test("la generación de PDF aplica las coordenadas y escala ajustadas de la rúbrica", () => {
  assert.match(app, /const ajuste = sanitizeRubricaAjuste\(perfil\.rubricaAjuste\);/);
  assert.match(app, /const w = baseW \* ajuste\.escala;/);
  assert.match(app, /const h = baseH \* ajuste\.escala;/);
  assert.match(app, /const offX = ajuste\.offsetX \* 0\.26;/);
  assert.match(app, /const offY = ajuste\.offsetY \* 0\.26;/);
});

test("los estilos css contienen soporte interactivo para el acomodo y aprobación de la rúbrica", () => {
  assert.match(css, /\.rubrica-interactive/);
  assert.match(css, /\.preview-rubrica-stage/);
  assert.match(css, /\.rubrica-controls-panel/);
  assert.match(css, /\.rubrica-dpad/);
  assert.match(css, /\.dpad-btn/);
  assert.match(css, /\.rubrica-zoom-btn/);
  assert.match(css, /\.btn-aprobar-documento/);
});
