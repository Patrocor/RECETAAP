import test from "node:test";
import assert from "node:assert/strict";
import { cie10Data, medicamentosData, examenesCatalogo } from "../catalogos.js";

test("los catálogos conservan el tamaño de la versión anterior", () => {
  assert.ok(cie10Data.length >= 2300);
  assert.ok(medicamentosData.length >= 800);
  assert.ok(examenesCatalogo.length >= 150);
  assert.ok(medicamentosData.some((med) => med.dci === "Omeprazol"));
  assert.ok(examenesCatalogo.some((ex) => ex.nombre === "Mamografía bilateral"));
  assert.ok(cie10Data.some((dx) => dx.codigo === "I10"));
  assert.equal(cie10Data.every((dx) => dx.tipo && dx.subtipo && dx.sistema), true);
  assert.equal(cie10Data.some((dx) => dx.tipo === "otro"), false);
  const porCodigo = new Map(cie10Data.map((dx) => [dx.codigo, dx]));
  assert.equal(porCodigo.get("K29.1").tipo, "agudo");
  assert.equal(porCodigo.get("K29.5").tipo, "crónico");
  assert.equal(porCodigo.get("K25.4").tipo, "crónico");
  assert.equal(porCodigo.get("N30.2").tipo, "crónico");
  assert.equal(porCodigo.get("N70.1").sistema, "Ginecología");
  assert.equal(porCodigo.get("J42").tipo, "crónico");
  assert.equal(new Set(cie10Data.map((dx) => dx.codigo)).size, cie10Data.length);
});
