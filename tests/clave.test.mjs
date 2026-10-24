import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nombreDeClave, resetAbierto } from "../api/clave.js";

test("el reset abierto solo vale con la bandera y antes del cierre", () => {
  const abierto = Date.parse("2026-10-24T12:00:00.000Z");
  const cerrado = Date.parse("2026-10-27T12:00:00.000Z");
  assert.equal(resetAbierto(abierto, "1"), true);
  assert.equal(resetAbierto(abierto, "0"), false);
  assert.equal(resetAbierto(cerrado, "1"), false);
});

test("el usuario de la clave toma la parte local del correo", () => {
  assert.equal(nombreDeClave(" Ana "), "ana");
  assert.equal(nombreDeClave("ana.r@gmail.com"), "ana.r");
});

test("la API de clave no expone secretos y usa el rol de servicio", () => {
  const api = readFileSync(new URL("../api/clave.js", import.meta.url), "utf8");
  const auth = readFileSync(new URL("../auth.js", import.meta.url), "utf8");
  const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.match(api, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(api, /process\.env\.CLAVE_RESET_ABIERTO/);
  assert.match(api, /email_confirm: true/);
  assert.equal(/eyJ[A-Za-z0-9._-]{20,}/.test(api), false);
  assert.equal(api.includes("innerHTML"), false);
  assert.equal(app.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
  assert.match(auth, /\/api\/clave/);
  assert.match(app, /definirClave/);
});
