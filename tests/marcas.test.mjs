import assert from "node:assert/strict";
import test from "node:test";
import { claveEspecialidad } from "../marcas.js";

test("la especialidad elige una marca mínima", () => {
  assert.equal(claveEspecialidad("Cardiología"), "cardio");
  assert.equal(claveEspecialidad("Reumatólogo"), "reuma");
  assert.equal(claveEspecialidad("Pediatría"), "pedia");
  assert.equal(claveEspecialidad("Medicina general"), "general");
  assert.equal(claveEspecialidad(""), "general");
});
