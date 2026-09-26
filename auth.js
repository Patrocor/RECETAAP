const URL_BASE = "https://cwavdcpvcqlkyasezrzs.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3YXZkY3B2Y3Fsa3lhc2V6cnpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2ODk0NzAsImV4cCI6MjA5MTI2NTQ3MH0.0_Sxsecx8OCokIMG0MZVM19TqkeMORPW6N_vv0y-cu0";
const SESION_KEY = "recetapp.sesion";

export function emailDeUsuario(usuario) {
  const nombre = String(usuario || "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(nombre)) return "";
  return `${nombre}@recetapp.pe`;
}

export function accesoVigente(acceso, ahora = Date.now()) {
  if (!acceso) return "Tu acceso está suspendido. Contacta al administrador.";
  if (acceso.active === false) return "Tu acceso está suspendido. Contacta al administrador.";
  if (acceso.exp_at && new Date(acceso.exp_at).getTime() < ahora) {
    return "Tu acceso ha expirado. Contacta al administrador.";
  }
  return "";
}

export function leerSesion() {
  try {
    const raw = JSON.parse(localStorage.getItem(SESION_KEY) || "null");
    if (!raw?.accessToken || !raw?.refreshToken) return null;
    return raw;
  } catch {
    return null;
  }
}

function guardarSesion(data, anterior = {}) {
  const sesion = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || anterior.refreshToken,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
    userId: data.user?.id || anterior.userId || "",
    email: data.user?.email || anterior.email || "",
  };
  localStorage.setItem(SESION_KEY, JSON.stringify(sesion));
  return sesion;
}

export function cerrarSesionLocal() {
  localStorage.removeItem(SESION_KEY);
}

async function authFetch(path, body) {
  const response = await fetch(`${URL_BASE}${path}`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const codigo = data.error_description || data.msg || data.error || data.message || "";
    throw new Error(codigo || "No se pudo iniciar sesión.");
  }
  return data;
}

async function tokenVigente() {
  const sesion = leerSesion();
  if (!sesion) return null;
  if (sesion.expiresAt - 30000 > Date.now()) return sesion;
  const data = await authFetch("/auth/v1/token?grant_type=refresh_token", {
    refresh_token: sesion.refreshToken,
  });
  return guardarSesion(data, sesion);
}

async function rest(path, { method = "GET", body } = {}) {
  const sesion = await tokenVigente();
  if (!sesion) throw new Error("Inicia sesión de nuevo.");
  const response = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${sesion.accessToken}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || "No se pudo guardar.");
  }
  return data;
}

export async function entrar(usuario, password) {
  const email = emailDeUsuario(usuario);
  if (!email || !password) return { ok: false, error: "Escribe usuario y contraseña." };
  let data;
  try {
    data = await authFetch("/auth/v1/token?grant_type=password", { email, password });
  } catch {
    cerrarSesionLocal();
    return { ok: false, error: "Usuario o contraseña incorrectos." };
  }
  guardarSesion(data);
  const nombre = email.slice(0, email.indexOf("@"));
  let filas = [];
  try {
    filas = await rest(`user_access?username=eq.${encodeURIComponent(nombre)}&select=id,username,nombre,active,exp_at`);
  } catch {
    cerrarSesionLocal();
    return { ok: false, error: "No se pudo comprobar el acceso." };
  }
  const acceso = Array.isArray(filas) ? filas[0] : null;
  const error = accesoVigente(acceso);
  if (error) {
    cerrarSesionLocal();
    return { ok: false, error };
  }
  let perfiles = [];
  try {
    perfiles = await rest(`profiles?username=eq.${encodeURIComponent(nombre)}&select=id,username,nombre,is_admin`);
  } catch {
    perfiles = [];
  }
  const perfil = Array.isArray(perfiles) ? perfiles[0] : null;
  return {
    ok: true,
    cuenta: {
      id: acceso.id,
      userId: data.user?.id || "",
      username: acceso.username,
      nombre: acceso.nombre || perfil?.nombre || acceso.username,
      isAdmin: Boolean(perfil?.is_admin),
    },
  };
}

export async function cuentaGuardada() {
  if (!leerSesion()) return null;
  try {
    const sesion = await tokenVigente();
    if (!sesion?.email) return null;
    const nombre = sesion.email.split("@")[0];
    const filas = await rest(`user_access?username=eq.${encodeURIComponent(nombre)}&select=id,username,nombre,active,exp_at`);
    const acceso = Array.isArray(filas) ? filas[0] : null;
    if (accesoVigente(acceso)) {
      cerrarSesionLocal();
      return null;
    }
    const perfiles = await rest(`profiles?username=eq.${encodeURIComponent(nombre)}&select=id,username,nombre,is_admin`);
    const perfil = Array.isArray(perfiles) ? perfiles[0] : null;
    return {
      id: acceso.id,
      userId: sesion.userId,
      username: acceso.username,
      nombre: acceso.nombre || perfil?.nombre || acceso.username,
      isAdmin: Boolean(perfil?.is_admin),
    };
  } catch {
    cerrarSesionLocal();
    return null;
  }
}

export async function listarAccesos() {
  return rest("user_access?select=id,username,nombre,active,exp_at,created_at&order=username.asc");
}

export async function actualizarAcceso(id, cambios) {
  await rest(`user_access?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: cambios });
}

export async function crearAcceso({ usuario, nombre, password, vence }) {
  const email = emailDeUsuario(usuario);
  if (!email) throw new Error("El usuario no es válido.");
  if (!password || password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
  const creado = await authFetch("/auth/v1/signup", { email, password });
  const userId = creado.user?.id || creado.id;
  if (!userId) throw new Error("No se pudo crear el usuario.");
  const username = email.slice(0, email.indexOf("@"));
  await rest("user_access", {
    method: "POST",
    body: {
      id: userId,
      username,
      nombre: nombre || username,
      active: true,
      exp_at: vence || null,
    },
  });
  await rest("profiles", {
    method: "POST",
    body: { id: userId, username, nombre: nombre || username, is_admin: false },
  });
}

export async function salir() {
  const sesion = leerSesion();
  cerrarSesionLocal();
  if (!sesion?.accessToken) return;
  await fetch(`${URL_BASE}/auth/v1/logout`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${sesion.accessToken}`,
    },
  }).catch(() => {});
}
