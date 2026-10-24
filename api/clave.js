const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cwavdcpvcqlkyasezrzs.supabase.co";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const RESET_HASTA = Date.parse("2026-10-26T05:00:00.000Z");

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function nombreDeClave(usuario) {
  const raw = String(usuario || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.includes("@")) return raw.slice(0, raw.indexOf("@"));
  return raw;
}

export function resetAbierto(ahora = Date.now(), env = process.env.CLAVE_RESET_ABIERTO) {
  return env === "1" && ahora < RESET_HASTA;
}

function claveOk(password) {
  return typeof password === "string" && password.length >= 8 && password.length <= 80;
}

function errorDeOrigen(status, text, fallback) {
  if (status >= 500 || /web server is down|error code 521/i.test(String(text || ""))) {
    return "El servidor de acceso no responde. Restaura el proyecto en Supabase.";
  }
  return fallback;
}

async function leerRespuesta(response) {
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { text, data };
}

async function restAdmin(path) {
  let response;
  try {
    response = await fetch(`${URL_BASE}/rest/v1/${path}`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    });
  } catch (error) {
    throw new Error(errorDeOrigen(502, error?.message, "El servidor de acceso no responde. Restaura el proyecto en Supabase."));
  }
  const { text, data } = await leerRespuesta(response);
  if (!response.ok) {
    throw new Error(errorDeOrigen(response.status, text, "No se pudo comprobar el acceso."));
  }
  return Array.isArray(data) ? data : [];
}

async function usuarioDeToken(token) {
  const response = await fetch(`${URL_BASE}/auth/v1/user`, {
    headers: {
      apikey: ANON_KEY || SERVICE_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) return null;
  return response.json().catch(() => null);
}

async function esAdmin(userId, username) {
  const filtros = [];
  if (userId) filtros.push(`id.eq.${userId}`);
  if (username) filtros.push(`username.eq.${username}`);
  if (!filtros.length) return false;
  const filas = await restAdmin(`profiles?or=(${filtros.join(",")})&select=is_admin`);
  return Boolean(filas[0]?.is_admin);
}

async function accesoPorNombre(nombre) {
  if (!nombre) return null;
  const filas = await restAdmin(`user_access?username=eq.${encodeURIComponent(nombre)}&select=id,username,active`);
  return filas[0] || null;
}

async function ponerClave(userId, password) {
  const response = await fetch(`${URL_BASE}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password, email_confirm: true }),
  });
  const { text, data } = await leerRespuesta(response);
  if (!response.ok) {
    throw new Error(errorDeOrigen(response.status, text, data?.msg || data?.message || "No se pudo guardar la contraseña."));
  }
}

export async function POST(request) {
  if (!SERVICE_KEY) return json({ error: "Sin servicio" }, 503);
  let payload = {};
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Datos inválidos." }, 400);
  }
  const password = String(payload?.password || "");
  if (!claveOk(password)) {
    return json({ error: "La contraseña debe tener al menos 8 caracteres." }, 400);
  }
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const destino = nombreDeClave(payload?.usuario);

  try {
    if (token) {
      const yo = await usuarioDeToken(token);
      if (!yo?.id) return json({ error: "Inicia sesión de nuevo." }, 401);
      const miNombre = nombreDeClave(yo.email);
      const admin = await esAdmin(yo.id, miNombre);
      const target = destino || miNombre;
      if (!admin && target !== miNombre) return json({ error: "No autorizado." }, 403);
      const acceso = await accesoPorNombre(target);
      if (!acceso) return json({ error: "No se encontró el usuario." }, 404);
      if (acceso.active === false && !admin) {
        return json({ error: "Tu acceso está suspendido." }, 403);
      }
      await ponerClave(acceso.id, password);
      return json({ ok: true });
    }

    if (!resetAbierto()) {
      return json({ error: "El restablecimiento abierto ya cerró." }, 403);
    }
    if (!/^[a-z0-9._-]{3,40}$/.test(destino)) {
      return json({ error: "Escribe el usuario." }, 400);
    }
    const acceso = await accesoPorNombre(destino);
    if (!acceso || acceso.active === false) {
      return json({ error: "No se encontró el usuario." }, 404);
    }
    await ponerClave(acceso.id, password);
    return json({ ok: true });
  } catch (error) {
    return json({ error: error.message || "No se pudo guardar la contraseña." }, 502);
  }
}
