import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");
const tema = await readFile(new URL("../tema.js", import.meta.url), "utf8");

test("el tema se resuelve a claro u oscuro antes de pintar y no deja data-theme vacío", () => {
  assert.match(html, /<script src="tema\.js"><\/script>/);
  assert.match(html, /name="color-scheme" content="light dark"/);
  assert.match(html, /styles\.css\?v=9/);
  assert.match(tema, /data-theme/);
  assert.match(tema, /prefers-color-scheme: dark/);
  assert.match(tema, /recetapp\.perfil/);
  assert.match(app, /function resolverTema\(/);
  assert.match(app, /function aplicarColorScheme\(/);
  assert.match(app, /document\.documentElement\.setAttribute\("data-theme", resolved\)/);
  assert.doesNotMatch(app, /removeAttribute\("data-theme"\)/);
});

test("las superficies clínicas usan tokens y no blancos huérfanos sobre tinta invertida", () => {
  assert.match(css, /--on-ink: #ffffff/);
  assert.match(css, /--on-ink: #0b1f33/);
  assert.match(css, /\.shell-flow \{[\s\S]*?background: var\(--bg\);/);
  assert.match(css, /\.shell-flow \.footer \{[\s\S]*?background: var\(--bg\);/);
  assert.match(css, /\.shell-flow \.footer \.btn\.ghost \{[\s\S]*?color: var\(--ink\);/);
  assert.match(css, /\.empty\.exam-empty \{[\s\S]*?background: var\(--card\);/);
  assert.doesNotMatch(css, /\.empty\.exam-empty \{[\s\S]*?background: rgba\(255, 255, 255, 0\.62\)/);
  assert.match(css, /\.order-heading h2 \{[\s\S]*?color: var\(--ink\);/);
  assert.match(css, /\.lede \{[\s\S]*?color: var\(--ink-soft\);/);
  assert.match(css, /\.fold \{[\s\S]*?background: var\(--card\);/);
  assert.match(css, /\.search-anchor \.suggestions \{[\s\S]*?background: var\(--card\);/);
  assert.match(css, /:root\[data-theme="light"\]/);
  assert.match(css, /color-scheme: light/);
  assert.match(css, /color-scheme: dark/);
});

test("el bloqueo de contraste cubre flujos, vacíos, previa y modo oscuro", () => {
  assert.match(css, /Contraste clínico en toda la app/);
  assert.match(css, /\.empty\.exam-empty strong/);
  assert.match(css, /\.preview-paper/);
  assert.match(css, /:root\[data-theme="dark"\] \.exam-kind/);
  assert.match(css, /\.desk-home \.desk-action-card:not\(\.primary\) \{[\s\S]*?background: #ffffff !important;/);
  assert.match(css, /\.segment button\.is-on \{[\s\S]*?color: var\(--on-ink\)/);
  assert.match(css, /\.chips button\.is-on \{[\s\S]*?color: var\(--on-ink\)/);
  assert.match(css, /\.add-btn\.is-on \{[\s\S]*?color: var\(--on-ink\)/);
  assert.match(css, /forced-color-adjust: none/);
  assert.match(css, /\.shell-flow \.footer \.btn:not\(\.ghost\)[\s\S]*?background: #123652 !important;/);
  assert.match(css, /\.shell-flow \.footer \.btn:not\(\.ghost\)[\s\S]*?color: #ffffff !important;/);
  assert.match(sw, /recetapp-v9/);
  assert.match(sw, /tema\.js/);
});

function hex(value) {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  assert.ok(match, value);
  return [
    Number.parseInt(match[1].slice(0, 2), 16),
    Number.parseInt(match[1].slice(2, 4), 16),
    Number.parseInt(match[1].slice(4, 6), 16),
  ];
}

function channel(value) {
  const scaled = value / 255;
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function luminance(color) {
  return 0.2126 * channel(color[0]) + 0.7152 * channel(color[1]) + 0.0722 * channel(color[2]);
}

function contrastRatio(foreground, background) {
  const light = Math.max(luminance(hex(foreground)), luminance(hex(background)));
  const dark = Math.min(luminance(hex(foreground)), luminance(hex(background)));
  return (light + 0.05) / (dark + 0.05);
}

test("los pares de tinta y superficie cumplen contraste WCAG AA", () => {
  const pairs = [
    ["#0b1f33", "#ffffff"],
    ["#0b1f33", "#f3f5fb"],
    ["#3d4758", "#ffffff"],
    ["#3d4758", "#f3f5fb"],
    ["#ffffff", "#123652"],
    ["#f0f4f8", "#121a2d"],
    ["#f0f4f8", "#090e1a"],
    ["#c5d0dc", "#121a2d"],
    ["#c5d0dc", "#18233c"],
    ["#0b1f33", "#f0f4f8"],
    ["#ffffff", "#0b1f33"],
  ];
  for (const [foreground, background] of pairs) {
    assert.ok(
      contrastRatio(foreground, background) >= 4.5,
      `${foreground} sobre ${background} = ${contrastRatio(foreground, background).toFixed(2)}`
    );
  }
});
