import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  calcularCantidad,
  dosisReferencia,
  buscarPacientes,
  pacientePorDni,
  nombreDesdeReniec,
  indicacionesAutomaticas,
  unidadDe,
} from "../automatizar.js";

test("la cantidad sale de frecuencia, duración y presentación", () => {
  assert.equal(calcularCantidad("500 mg tabletas", "Cada 8 horas", "5"), "15 tabletas");
  assert.equal(calcularCantidad("500 mg tabletas", "Cada 8 horas", "2 semanas"), "42 tabletas");
  assert.equal(calcularCantidad("Inhalador 100 mcg/dosis", "Dosis única", "7"), "1 dosis");
  assert.equal(calcularCantidad("500 mg tabletas", "Según necesidad", "5"), "");
  assert.equal(unidadDe("10 mg/ml gotas"), "gotas");
  assert.equal(calcularCantidad("250 mg/5 mL jarabe", "Cada 8 horas", "5"), "15 dosis");
  assert.equal(unidadDe("125 mg supositorios"), "supositorios");
  assert.equal(unidadDe("75 mg/3 mL ampolla IM"), "ampollas");
  assert.equal(calcularCantidad("75 mg/3 mL ampolla IM", "Cada 24 horas", "3"), "3 ampollas");
});

test("la dosis de referencia usa el catálogo", () => {
  assert.equal(dosisReferencia({ dosisMg: 500 }), "500 mg");
  assert.equal(dosisReferencia({ dosisMg: 0.5 }), "0.5 mg");
  assert.equal(dosisReferencia({ presentacion: "1 g tabletas" }), "1 g");
  assert.equal(dosisReferencia({ presentacion: "500/10 mg tabletas" }), "500/10 mg");
  assert.equal(dosisReferencia({}), "");
});

test("el DNI y el nombre recuperan al paciente guardado", () => {
  const lista = [
    { nombre: "Ana Pérez", dni: "12345678", edad: "35", sexo: "F" },
    { nombre: "Luis Ramos", dni: "87654321", edad: "50", sexo: "M" },
  ];
  assert.equal(pacientePorDni(lista, "12345678").nombre, "Ana Pérez");
  assert.equal(pacientePorDni(lista, "123"), null);
  assert.equal(buscarPacientes(lista, "1234")[0].dni, "12345678");
  assert.equal(buscarPacientes(lista, "ram")[0].nombre, "Luis Ramos");
  assert.equal(buscarPacientes(lista, "a").length, 0);
});

test("el nombre oficial sale de la consulta por DNI", () => {
  assert.equal(nombreDesdeReniec({
    first_name: "ROXANA KARINA",
    first_last_name: "DELGADO",
    second_last_name: "HUAMANI",
    full_name: "DELGADO HUAMANI ROXANA KARINA",
    document_number: "46027897",
  }), "Delgado Huamani Roxana Karina");
  assert.equal(nombreDesdeReniec({ first_name: "ANA", first_last_name: "PÉREZ" }), "Pérez Ana");
  assert.equal(nombreDesdeReniec(null), "");
});

test("las indicaciones se arman con lo ya recetado", () => {
  const texto = indicacionesAutomaticas({
    diagnostico: "J00 - Resfriado",
    medicamentos: [{ nombre: "Paracetamol", dosis: "500 mg", frecuencia: "Cada 8 horas", duracion: "3 días", via: "Vía oral", indicaciones: "Con alimentos" }],
  });
  assert.match(texto, /Paracetamol: 500 mg, Cada 8 horas, 3 días, Vía oral\./);
  assert.match(texto, /Con alimentos/);
  assert.match(texto, /Control según evolución/);
});

test("el módulo nuevo no interpreta HTML", () => {
  const source = readFileSync(new URL("../automatizar.js", import.meta.url), "utf8");
  assert.equal(source.includes("innerHTML"), false);
  assert.equal(source.includes("insertAdjacentHTML"), false);
});
