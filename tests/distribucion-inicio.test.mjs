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

test("las tarjetas de inicio usan colores de contraste explícitos y no heredan tinta de modo oscuro", () => {
  assert.match(css, /\.desk-action-card \{[\s\S]*?color: #0b1f33;/);
  assert.match(css, /\.desk-action-desc \{[\s\S]*?color: #1f3346;/);
  assert.match(css, /\.desk-action-card\.primary \.desk-action-desc \{[\s\S]*?color: #e8eef4;/);
  assert.match(css, /\.desk-home \.desk-date \{[\s\S]*?color: #e8eef4;/);
  assert.match(css, /\.desk-home \.desk-meta \{[\s\S]*?color: #ffffff;/);
  assert.match(css, /\.desk-rail-dock button \{[\s\S]*?color: #1f3346;/);
  assert.match(css, /color-scheme: light;/);
  assert.match(css, /\.desk-action-card:not\(\.primary\) \.desk-action-icon \{[\s\S]*?background: #123652;/);
});

test("la orden de exámenes guarda la última atención para continuidad en inicio", () => {
  assert.match(app, /guardarUltima\(\);\s*composer = null;\s*screen = origenExamenes/);
});
