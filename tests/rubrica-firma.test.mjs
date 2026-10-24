import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  cajaRubrica,
  estiloPosicionRubrica,
  layoutRubrica,
  offsetsDesdePunto,
  plantillaRubrica,
  puntoDesdeEvento,
  sanitizeRubricaAjuste,
} from "../rubrica.js";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const rubrica = await readFile(new URL("../rubrica.js", import.meta.url), "utf8");

test("el perfil incluye gestión explícita de la rúbrica de la firma e imagen", () => {
  assert.match(app, /Rúbrica de la firma y sello médico/);
  assert.match(app, /Cargar rúbrica de firma o sello/);
  assert.match(app, /Quitar rúbrica/);
  assert.match(app, /rubricaAjuste/);
  assert.match(app, /sanitizeRubricaAjuste/);
});

test("la vista previa coloca la rúbrica en vivo sobre el PDF y responde al tap", () => {
  assert.match(app, /previewSignatureBox/);
  assert.match(app, /rubrica-interactive/);
  assert.match(app, /preview-rubrica-viva/);
  assert.match(app, /function overlayRubricaViva\(/);
  assert.match(app, /function aplicarRubricaViva\(/);
  assert.match(app, /function iniciarArrastreRubrica\(/);
  assert.match(app, /function colocarRubricaEnHoja\(/);
  assert.match(app, /Toca el documento para colocar la rúbrica/);
  assert.match(app, /rubrica-controls-panel/);
  assert.match(app, /Acomodar rúbrica:/);
  assert.match(app, /rubrica-dpad/);
  assert.match(app, /rubrica-zoom-row/);
  assert.match(app, /rubrica-reset-btn/);
  assert.match(app, /refrescarPreviaPdf/);
  assert.match(app, /montarHojasPreviasPdf/);
  assert.match(app, /firma: false/);
  assert.match(app, /opts\.firma !== false/);
  assert.doesNotMatch(app, /semillaPreviaLocal/);
  assert.doesNotMatch(app, /get\("vista"\)/);
});

test("el botón de aprobar y emitir documento está disponible en la vista previa", () => {
  assert.match(app, /btn-aprobar-documento/);
  assert.match(app, /Aprobar y Emitir Receta/);
  assert.match(app, /Aprobar y Emitir Orden/);
});

test("la generación de PDF aplica las coordenadas y escala ajustadas de la rúbrica", () => {
  assert.match(app, /const ajuste = sanitizeRubricaAjuste\(perfil\.rubricaAjuste\);/);
  assert.match(app, /cajaRubrica/);
  assert.match(app, /doc\.addImage\(perfil\.firmaSello, "PNG", caja\.x, caja\.y, caja\.w, caja\.h/);
  assert.match(rubrica, /baseW \* a\.escala/);
  assert.match(rubrica, /baseH \* a\.escala/);
  assert.match(rubrica, /a\.offsetX \* RUBRICA_MM_POR_OFFSET/);
  assert.match(rubrica, /pageW - w - 3/);
});

test("los estilos css contienen soporte interactivo para el acomodo vivo de la rúbrica", () => {
  assert.match(css, /\.rubrica-interactive/);
  assert.match(css, /\.preview-rubrica-viva/);
  assert.match(css, /\.preview-pdf-stage\.is-rubrica-viva/);
  assert.match(css, /touch-action: none/);
  assert.match(css, /\.rubrica-controls-panel/);
  assert.match(css, /\.rubrica-dpad/);
  assert.match(css, /\.dpad-btn/);
  assert.match(css, /\.rubrica-zoom-btn/);
  assert.match(css, /\.btn-aprobar-documento/);
});

test("sanitizeRubricaAjuste admite recorrer toda la hoja", () => {
  assert.deepEqual(sanitizeRubricaAjuste({ offsetX: -900, offsetY: 800, escala: 3 }), {
    offsetX: -720,
    offsetY: 560,
    escala: 1.8,
  });
  assert.deepEqual(sanitizeRubricaAjuste({}), { offsetX: 0, offsetY: 0, escala: 1 });
});

test("el tap inverso coloca el centro de la rúbrica en el punto tocado", () => {
  const receta = plantillaRubrica("mitad");
  assert.equal(receta.pageW, 210);
  assert.equal(receta.posX, 148);
  const centro = offsetsDesdePunto("mitad", 40, 130, { escala: 1 });
  const caja = layoutRubrica("mitad", centro);
  assert.ok(Math.abs((caja.x + caja.w / 2) - 40) < 0.3);
  assert.ok(Math.abs((caja.y + caja.h / 2) - 130) < 0.3);
});

test("el mapa de evento y el estilo CSS usan milímetros de la hoja", () => {
  const punto = puntoDesdeEvento({ left: 0, top: 0, width: 210, height: 148.5 }, 105, 74.25, "mitad");
  assert.equal(punto.xMm, 105);
  assert.equal(punto.yMm, 74.25);
  const estilo = estiloPosicionRubrica(cajaRubrica(plantillaRubrica("mitad"), { offsetX: 0, offsetY: 0, escala: 1 }));
  assert.match(estilo, /left:/);
  assert.match(estilo, /top:/);
  assert.match(estilo, /width:/);
  assert.match(estilo, /height:/);
  assert.equal(puntoDesdeEvento({ width: 0, height: 0 }, 10, 10, "mitad"), null);
});
