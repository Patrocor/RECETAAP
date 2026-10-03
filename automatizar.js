/** Cálculos locales: pacientes recordados, dosis de referencia y cantidad de insumos. */

const TOMAS_POR_DIA = {
  "Cada 4 horas": 6,
  "Cada 6 horas": 4,
  "Cada 8 horas": 3,
  "Cada 12 horas": 2,
  "Cada 24 horas": 1,
  "2 veces al día": 2,
  "3 veces al día": 3,
};

const UNIDADES = ["tabletas", "cápsulas", "comprimidos", "ampollas", "sobres", "supositorios", "óvulos", "gotas", "dosis"];

export function unidadDe(presentacion) {
  const texto = String(presentacion || "").toLowerCase();
  const directa = UNIDADES.find((unidad) => texto.includes(unidad));
  if (directa) return directa;
  if (/jarabe|suspensi[oó]n|soluci[oó]n|elixir/.test(texto)) return "dosis";
  return "unidades";
}

export function diasDe(duracion) {
  const match = String(duracion || "").match(/\d+/);
  if (!match) return 0;
  const n = Number(match[0]);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (/semana/i.test(duracion)) return n * 7;
  if (/mes/i.test(duracion)) return n * 30;
  return n;
}

/** Una unidad por toma. Dosis única es un solo insumo. */
export function calcularCantidad(presentacion, frecuencia, duracion) {
  const unidad = unidadDe(presentacion);
  if (frecuencia === "Dosis única") return `1 ${unidad}`;
  const tomas = TOMAS_POR_DIA[frecuencia];
  const dias = diasDe(duracion);
  if (!tomas || !dias) return "";
  return `${tomas * dias} ${unidad}`;
}

export function dosisReferencia(med) {
  if (!med || typeof med !== "object") return "";
  if (typeof med.dosisMg === "number" && Number.isFinite(med.dosisMg)) return `${med.dosisMg} mg`;
  const presentacion = String(med.presentacion || "").trim();
  const match = presentacion.match(/^(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)*)\s*(mg|g|mcg|µg|ui|ml)/i);
  if (!match) return "";
  return `${match[1].replace(/\s+/g, "")} ${match[2].toLowerCase() === "ml" ? "mL" : match[2]}`;
}

export function buscarPacientes(lista, query) {
  const texto = String(query || "").trim().toLowerCase();
  const digitos = texto.replace(/\D/g, "");
  if (texto.length < 2 && digitos.length < 2) return [];
  return (lista || []).filter((paciente) => {
    const nombre = String(paciente.nombre || "").toLowerCase();
    const dni = String(paciente.dni || "");
    return (texto.length >= 2 && nombre.includes(texto)) || (digitos.length >= 2 && dni.startsWith(digitos));
  }).slice(0, 8);
}

export function nombreDesdeReniec(data) {
  if (!data || typeof data !== "object") return "";
  const partes = [data.first_last_name, data.second_last_name, data.first_name]
    .map((parte) => String(parte || "").trim())
    .filter(Boolean);
  const texto = String(data.full_name || "").trim() || partes.join(" ");
  return texto
    .toLocaleLowerCase("es")
    .replace(/(^|[\s'-])(\p{L})/gu, (_, sep, letra) => sep + letra.toLocaleUpperCase("es"))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function pacientePorDni(lista, dni) {
  if (!/^\d{8}$/.test(String(dni || ""))) return null;
  return (lista || []).find((paciente) => paciente.dni === dni) || null;
}

export function indicacionesAutomaticas(draft) {
  const lines = [];
  for (const med of draft?.medicamentos || []) {
    const pauta = [med.dosis, med.frecuencia, med.duracion, med.via].filter(Boolean).join(", ");
    let line = med.nombre || "";
    if (pauta) line += `: ${pauta}.`;
    if (med.indicaciones) line += ` ${med.indicaciones}`;
    if (line) lines.push(line);
  }
  if (draft?.diagnostico) lines.push("Control según evolución.");
  return lines.join("\n").slice(0, 800);
}
