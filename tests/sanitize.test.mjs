import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  cleanText,
  cleanMultiline,
  onlyDigits,
  validarEdad,
  validarDni,
  validarEmail,
  perfilListo,
  fileSlug,
} from "../sanitize.js";

test("cleanText quita controles y recorta", () => {
  assert.equal(cleanText("  Ana\u0000\nPérez  ", 20), "Ana Pérez");
  assert.equal(cleanText("x".repeat(50), 8), "xxxxxxxx");
});

test("cleanMultiline conserva saltos de línea", () => {
  assert.equal(cleanMultiline("Reposo\r\nLíquidos\u0000"), "Reposo\nLíquidos");
});

test("onlyDigits limita el DNI", () => {
  assert.equal(onlyDigits("12.345.678-9", 8), "12345678");
});

test("validadores de paciente y perfil", () => {
  assert.equal(validarEdad(""), "Indica la edad.");
  assert.equal(validarEdad("35"), "");
  assert.equal(validarEdad("200") !== "", true);
  assert.equal(validarDni(""), "");
  assert.equal(validarDni("1234567") !== "", true);
  assert.equal(validarDni("12345678"), "");
  assert.equal(validarEmail(""), "");
  assert.equal(validarEmail("no-es-correo") !== "", true);
  assert.equal(validarEmail("dra@ejemplo.pe"), "");
  assert.equal(perfilListo({ nombre: "Ana", cmp: "" }), false);
  assert.equal(perfilListo({ nombre: "Ana", cmp: "12345" }), true);
});

test("la interfaz no interpreta HTML ni afirma una firma digital", () => {
  const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const page = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.equal(app.includes("innerHTML"), false);
  assert.equal(app.includes("insertAdjacentHTML"), false);
  assert.equal(app.includes("Firmado digitalmente"), false);
  assert.equal(page.includes("Firmado digitalmente"), false);
  assert.equal(page.includes("integrity="), true);
  const dni = app.indexOf('field("DNI", "paciente-dni"');
  const nombre = app.indexOf('field("Nombre", "paciente-nombre"');
  assert.equal(dni > 0 && dni < nombre, true);
  assert.equal(app.includes("HC: ${draft.pacienteDNI}"), true);
  assert.equal(app.includes("cantidadManual"), false);
  assert.equal(app.includes('readonly: "readonly"'), true);
  assert.equal(app.includes("Firma y Sello"), true);
  assert.equal(app.includes("CIE-10:"), true);
  assert.equal(app.includes("Próximo control:"), true);
  assert.equal(app.includes("LESTER"), false);
  assert.equal(app.includes("63834"), false);
});

test("el nombre de archivo no arrastra rutas ni marcas", () => {
  assert.equal(fileSlug("../../Ana Pérez"), "Ana_Perez");
  assert.equal(fileSlug("<script>"), "script");
  assert.equal(fileSlug(""), "paciente");
});
