const URL_BASE = "https://cwavdcpvcqlkyasezrzs.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3YXZkY3B2Y3Fsa3lhc2V6cnpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2ODk0NzAsImV4cCI6MjA5MTI2NTQ3MH0.0_Sxsecx8OCokIMG0MZVM19TqkeMORPW6N_vv0y-cu0";
const SESION_KEY = "recetapp.sesion";

const USUARIO_RE = /^[a-z0-9._-]{3,40}$/;
const CORREO_RE = /^[a-z0-9._%+-]{1,64}@[a-z0-9.-]+\.[a-z]{2,24}$/;

export function correosDeUsuario(usuario) {
  const raw = String(usuario || "").trim().toLowerCase();
  if (!raw) return [];
  if (raw.includes("@")) {
    if (!CORREO_RE.test(raw)) return [];
    const local = raw.slice(0, raw.indexOf("@"));
    const lista = [raw];
    if (!raw.endsWith("@recetapp.pe") && USUARIO_RE.test(local)) {
      lista.push(`${local}@recetapp.pe`);
    }
    return lista;
  }
  if (!USUARIO_RE.test(raw)) return [];
  return [`${raw}@recetapp.pe`];
}

export function emailDeUsuario(usuario) {
  return correosDeUsuario(usuario)[0] || "";
}

export function claveValida(password) {
  const clave = String(password ?? "");
  if (clave.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (clave.length > 80) return "La contraseña es demasiado larga.";
  return "";
}

async function postClave(password, { usuario = "", token = "" } = {}) {
  const error = claveValida(password);
  if (error) return { ok: false, error };
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const response = await fetch("/api/clave", {
      method: "POST",
      headers,
      body: JSON.stringify({ usuario, password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: mensajeDeRed(data.error) || data.error || "No se pudo guardar la contraseña." };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: mensajeDeRed(error?.message) || "El servidor de acceso no responde. Restaura el proyecto en Supabase." };
  }
}

export async function definirClave(usuario, password) {
  if (!String(usuario || "").trim()) return { ok: false, error: "Escribe el usuario." };
  return postClave(password, { usuario });
}

export async function cambiarClave(password, usuario = "") {
  let sesion;
  try {
    sesion = await tokenVigente();
  } catch {
    sesion = null;
  }
  if (!sesion?.accessToken) return { ok: false, error: "Inicia sesión de nuevo." };
  return postClave(password, { usuario, token: sesion.accessToken });
}

export function mensajeDeRed(detalle) {
  const texto = String(detalle || "").toLowerCase();
  if (/fetch failed|failed to fetch|networkerror|load failed|enotfound|econnreset|econnrefused|521|web server is down/.test(texto)) {
    return "El servidor de acceso no responde. Restaura el proyecto en Supabase.";
  }
  return "";
}

export function mensajeDeAuth(detalle) {
  const red = mensajeDeRed(detalle);
  if (red) return red;
  const texto = String(detalle || "").toLowerCase();
  if (/not confirmed|email_not_confirmed/.test(texto)) {
    return "Confirma el correo antes de entrar.";
  }
  if (/too many|rate limit/.test(texto)) {
    return "Demasiados intentos. Espera un momento.";
  }
  if (/invalid.*(grant|credentials|login)|invalid_grant|invalid login/.test(texto)) {
    return "Usuario o contraseña incorrectos.";
  }
  return "Usuario o contraseña incorrectos.";
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
  let response;
  try {
    response = await fetch(`${URL_BASE}${path}`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(mensajeDeAuth(error?.message || "fetch failed"));
  }
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!response.ok) {
    if (response.status >= 500 || /web server is down|error code 521/i.test(text)) {
      throw new Error("El servidor de acceso está caído. Restaura el proyecto en Supabase.");
    }
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

async function buscarFilas(path) {
  const filas = await rest(path);
  return Array.isArray(filas) ? filas : [];
}

export async function entrar(usuario, password) {
  const correos = correosDeUsuario(usuario);
  const clave = String(password ?? "");
  if (!correos.length || !clave) return { ok: false, error: "Escribe usuario y contraseña." };
  let data;
  let detalle = "";
  for (const email of correos) {
    try {
      data = await authFetch("/auth/v1/token?grant_type=password", { email, password: clave });
      detalle = "";
      break;
    } catch (error) {
      detalle = error?.message || "";
    }
  }
  if (!data) {
    cerrarSesionLocal();
    return { ok: false, error: mensajeDeAuth(detalle) };
  }
  guardarSesion(data);
  const userId = data.user?.id || "";
  const nombre = String(data.user?.email || correos[0]).split("@")[0];
  let filas = [];
  try {
    if (userId) {
      filas = await buscarFilas(`user_access?id=eq.${encodeURIComponent(userId)}&select=id,username,nombre,active,exp_at`);
    }
    if (!filas.length && nombre) {
      filas = await buscarFilas(`user_access?username=eq.${encodeURIComponent(nombre)}&select=id,username,nombre,active,exp_at`);
    }
  } catch {
    cerrarSesionLocal();
    return { ok: false, error: "No se pudo comprobar el acceso." };
  }
  const acceso = filas[0] || null;
  const error = accesoVigente(acceso);
  if (error) {
    cerrarSesionLocal();
    return { ok: false, error };
  }
  let perfiles = [];
  try {
    if (userId) {
      perfiles = await buscarFilas(`profiles?id=eq.${encodeURIComponent(userId)}&select=id,username,nombre,is_admin`);
    }
    if (!perfiles.length) {
      perfiles = await buscarFilas(`profiles?username=eq.${encodeURIComponent(nombre)}&select=id,username,nombre,is_admin`);
    }
  } catch {
    perfiles = [];
  }
  const perfil = perfiles[0] || null;
  return {
    ok: true,
    cuenta: {
      id: acceso.id,
      userId,
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
  const errorClave = claveValida(password);
  if (errorClave) throw new Error(errorClave);
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
