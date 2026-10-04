import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

test("la pantalla de inicio ofrece accesos directos para receta y orden de exámenes", () => {
  assert.match(app, /Nueva receta/);
  assert.match(app, /Orden de exámenes/);
  assert.match(app, /desk-action-card/);
  assert.match(app, /origenExamenes = "inicio"/);
});

test("la pantalla de inicio incluye continuidad clínica y dock inferior de cuenta", () => {
  assert.match(app, /Consultorio activo/);
  assert.match(app, /Borrador en curso/);
  assert.match(app, /Última atención emitida/);
  assert.match(app, /desk-rail-dock/);
  assert.match(app, /icono\("user"\)/);
  assert.match(app, /icono\("logout"\)/);
});

test("el estilo de inicio equilibra la distribución y evita saltos huérfanos de texto", () => {
  assert.match(css, /\.desk-home \.desk-name/);
  assert.match(css, /text-wrap: balance;/);
  assert.match(css, /\.desk-rail-dock/);
  assert.match(css, /\.desk-main-actions/);
  assert.match(css, /\.desk-status-card/);
});

test("la orden de exámenes guarda la última atención para continuidad en inicio", () => {
  assert.match(app, /guardarUltima\(\);\s*composer = null;\s*screen = origenExamenes/);
});
