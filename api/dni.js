import { nombreDesdeReniec } from "../automatizar.js";

export async function GET(request) {
  const numero = new URL(request.url).searchParams.get("numero") || "";
  if (!/^\d{8}$/.test(numero)) {
    return Response.json({ error: "DNI inválido" }, { status: 400 });
  }
  const token = process.env.DECOLECTA_TOKEN;
  if (!token) {
    return Response.json({ error: "Sin consulta" }, { status: 503 });
  }
  let upstream;
  try {
    upstream = await fetch(`https://api.decolecta.com/v1/reniec/dni?numero=${numero}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return Response.json({ error: "No disponible" }, { status: 502 });
  }
  if (upstream.status === 404) {
    return Response.json({ error: "No encontrado" }, { status: 404 });
  }
  if (!upstream.ok) {
    return Response.json({ error: "No disponible" }, { status: 502 });
  }
  let data;
  try {
    data = await upstream.json();
  } catch {
    return Response.json({ error: "No disponible" }, { status: 502 });
  }
  const documento = String(data?.document_number || "").replace(/\D/g, "");
  if (documento && documento !== numero) {
    return Response.json({ error: "No encontrado" }, { status: 404 });
  }
  const nombre = nombreDesdeReniec(data);
  if (!nombre) return Response.json({ error: "No encontrado" }, { status: 404 });
  return Response.json(
    { nombre, dni: numero },
    { headers: { "Cache-Control": "private, max-age=86400" } },
  );
}
