import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

test("el sistema visual define sombras, radios y curvas de movimiento", () => {
  assert.match(css, /--shadow-sm:/);
  assert.match(css, /--shadow-md:/);
  assert.match(css, /--shadow-lg:/);
  assert.match(css, /--ease-spring:/);
  assert.match(css, /--ease-smooth:/);
  assert.match(css, /--radius-lg:/);
});

test("las pantallas, hojas y modales usan transiciones elásticas", () => {
  assert.match(css, /@keyframes screen-slide-fade/);
  assert.match(css, /@keyframes sheet-slide-up/);
  assert.match(css, /@keyframes modal-pop-in/);
  assert.match(css, /@keyframes dropdown-pop/);
  assert.match(css, /@keyframes success-pop/);
  assert.match(css, /backdrop-filter: blur/);
});

test("los controles clínicos tienen feedback táctil y motion reducido", () => {
  assert.match(css, /\.btn:hover:not\(:disabled\)/);
  assert.match(css, /\.desk-action-card:hover/);
  assert.match(css, /\.item:hover, \.review:hover/);
  assert.match(css, /\.historial-card:hover/);
  assert.match(css, /\.tx-card:hover/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
