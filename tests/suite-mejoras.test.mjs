import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { verificarAlertaSeguridad } from "../automatizar.js";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const manifestRaw = await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8");
const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("sello y firma digitalizada están integrados en perfil y generación de PDF", () => {
  assert.match(app, /firmaSello/);
  assert.match(app, /doc\.addImage\(perfil\.firmaSello/);
  assert.match(app, /class:\s*"firma-container/);
  assert.match(css, /\.firma-container/);
  assert.match(css, /\.preview-firma-img/);
});

test("historial de atenciones locales permite registro y re-prescripción", () => {
  assert.match(app, /HISTORIAL_KEY = "recetapp\.historial"/);
  assert.match(app, /function leerHistorial\(\)/);
  assert.match(app, /function guardarHistorialItem\(/);
  assert.match(app, /function rePrescribirHistorial\(/);
  assert.match(app, /function atenderPacienteHistorial\(/);
  assert.match(app, /function viewHistorial\(\)/);
  assert.match(css, /\.historial-card/);
  assert.match(css, /\.historial-badge/);
});

test("alertas clínicas verifican duplicidad e interacciones de AINEs sistémicos", () => {
  assert.match(app, /verificarAlertaSeguridad/);
  assert.match(css, /\.clinical-alert/);

  const lista = [
    { id: 1, nombre: "Ibuprofeno 400 mg", via: "Oral" },
  ];
  const alertaDuplicidad = verificarAlertaSeguridad({ id: 2, nombre: "Ibuprofeno 600 mg", via: "Oral" }, lista, null);
  assert.ok(alertaDuplicidad && alertaDuplicidad.tipo === "duplicidad");

  const alertaAine = verificarAlertaSeguridad({ id: 3, nombre: "Naproxeno 500 mg", via: "Oral" }, lista, null);
  assert.ok(alertaAine && alertaAine.tipo === "aine");

  const sinAlertaTopico = verificarAlertaSeguridad({ id: 4, nombre: "Diclofenaco 1% gel", via: "Tópica" }, lista, null);
  assert.equal(sinAlertaTopico, null);
});

test("vista previa antes de emitir y pantalla de listo con WhatsApp y Web Share", () => {
  assert.match(app, /function abrirPrevia\(/);
  assert.match(app, /function viewPrevia\(\)/);
  assert.match(app, /function viewListo\(\)/);
  assert.match(app, /function compartirWhatsApp\(\)/);
  assert.match(app, /function compartirReceta\(\)/);
  assert.match(css, /\.preview-paper/);
  assert.match(css, /\.btn-whatsapp/);
  assert.match(css, /\.btn-share/);
  assert.match(css, /\.listo-card/);
});

test("modo oscuro adaptativo configurado con variables CSS y selector de tema", () => {
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /:root\[data-theme="light"\]/);
  assert.match(css, /@media \(prefers-color-scheme: dark\)/);
  assert.match(app, /function aplicarTema\(/);
  assert.match(app, /function resolverTema\(/);
  assert.match(app, /tema: "auto"/);
});

test("soporte PWA offline incluye manifest válido, sw.js y metadatos en index.html", () => {
  const manifest = JSON.parse(manifestRaw);
  assert.ok(manifest.name.includes("RecetAPP"));
  assert.equal(manifest.display, "standalone");
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0);

  assert.match(sw, /recetapp-v4/);
  assert.match(sw, /caches\.open/);
  assert.match(sw, /self\.addEventListener\("fetch"/);

  assert.match(html, /rel="manifest" href="manifest\.webmanifest"/);
  assert.match(html, /name="theme-color"/);
});
