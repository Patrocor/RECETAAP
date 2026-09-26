import test from "node:test";
import assert from "node:assert/strict";
import { cie10Data, medicamentosData, examenesCatalogo } from "../catalogos.js";

test("los catálogos conservan el tamaño de la versión anterior", () => {
  assert.ok(cie10Data.length >= 2000);
  assert.ok(medicamentosData.length >= 800);
  assert.ok(examenesCatalogo.length >= 150);
  assert.ok(medicamentosData.some((med) => med.dci === "Omeprazol"));
  assert.ok(examenesCatalogo.some((ex) => ex.nombre === "Mamografía bilateral"));
  assert.ok(cie10Data.some((dx) => dx.codigo === "I10"));
});
