import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { accesoVigente, emailDeUsuario } from "../auth.js";

test("el usuario se convierte en el correo interno", () => {
  assert.equal(emailDeUsuario(" Ana "), "ana@recetapp.pe");
  assert.equal(emailDeUsuario("a"), "");
  assert.equal(emailDeUsuario("ana@otro.pe"), "");
});

test("el acceso vencido o suspendido no entra", () => {
  const ahora = Date.parse("2026-09-26T12:00:00Z");
  assert.equal(accesoVigente({ active: true, exp_at: null }, ahora), "");
  assert.match(accesoVigente({ active: false, exp_at: null }, ahora), /suspendido/);
  assert.match(accesoVigente({ active: true, exp_at: "2026-09-01T00:00:00Z" }, ahora), /expirado/);
  assert.equal(accesoVigente({ active: true, exp_at: "2026-10-01T00:00:00Z" }, ahora), "");
});

test("la página puede hablar con el acceso y no interpreta HTML", () => {
  const page = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const auth = readFileSync(new URL("../auth.js", import.meta.url), "utf8");
  assert.match(page, /connect-src [^;]*https:\/\/cwavdcpvcqlkyasezrzs\.supabase\.co/);
  assert.equal(auth.includes("innerHTML"), false);
  assert.equal(auth.includes("__ANON_KEY__"), false);
});
