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
  if (/ampolla/.test(texto)) return "ampollas";
  if (/jeringa/.test(texto)) return "jeringas";
  if (/\bvial\b/.test(texto)) return "viales";
  if (/jarabe|suspensi[oó]n|soluci[oó]n|elixir|sobre/.test(texto)) return "dosis";
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
    if (draft?.fechaFin) line += ` (hasta el ${draft.fechaFin})`;
    if (line) lines.push(line);
  }
  if (draft?.diagnostico) lines.push("Control según evolución.");
  return lines.join("\n").slice(0, 800);
}

/** Calcula la duración máxima en días de una lista de medicamentos */
export function duracionMaximaTratamiento(medicamentos) {
  let maxDias = 0;
  for (const m of medicamentos || []) {
    const d = diasDe(m?.duracion);
    if (d > maxDias) maxDias = d;
  }
  return maxDias ? (maxDias === 1 ? "1 día" : `${maxDias} días`) : "";
}

/** Calcula la fecha estimada de término del tratamiento según fecha de inicio y días. */
export function fechaFinTratamiento(fechaInicio, duracion) {
  const dias = diasDe(duracion);
  if (!dias || !/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio || "")) return "";
  const [y, m, d] = fechaInicio.split("-").map(Number);
  const fin = new Date(y, m - 1, d + dias);
  return fin.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).replace(/\./g, "").replace(/ de /g, " ");
}

/**
 * Calculadora de dosificación pediátrica por peso (mg/kg/día).
 * Retorna dosis en mg por toma y volumen en mL o gotas según la concentración.
 */
export function calcularDosisPediatrica(pesoKg, mgPorKgDia, tomasPorDia, concMg, concMl = 1) {
  const peso = Number(pesoKg);
  const mgDia = Number(mgPorKgDia);
  const tomas = Number(tomasPorDia);
  const cMg = Number(concMg);
  const cMl = Number(concMl) || 1;

  if (!peso || peso <= 0 || !mgDia || mgDia <= 0 || !tomas || tomas <= 0 || !cMg || cMg <= 0) {
    return null;
  }

  const dosisTotalDiaMg = peso * mgDia;
  const dosisTomaMg = Number((dosisTotalDiaMg / tomas).toFixed(1));
  const mlPorToma = Number(((dosisTomaMg * cMl) / cMg).toFixed(1));
  const gotasPorToma = Math.round(mlPorToma * 20); // 20 gotas ≈ 1 mL estándar

  return {
    dosisTomaMg,
    mlPorToma,
    gotasPorToma,
    dosisTotalDiaMg: Number(dosisTotalDiaMg.toFixed(1)),
    resumen: `${mlPorToma} mL (${gotasPorToma} gotas) cada toma [${dosisTomaMg} mg]`,
  };
}

const AINES_LIST = [
  "ibuprofeno",
  "naproxeno",
  "ketorolaco",
  "diclofenaco",
  "ketoprofeno",
  "meloxicam",
  "celecoxib",
  "etoricoxib",
  "piroxicam",
  "tenoxicam",
  "indometacina",
  "clonixinato de lisina",
  "dexketoprofeno",
  "nimesulida",
  "aspirina",
  "acido acetilsalicilico",
];

export function esAineTexto(texto) {
  const t = String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/\baine\b/.test(t)) return true;
  return AINES_LIST.some((aine) => t.includes(aine));
}

export function esViaSistemica(via) {
  const v = String(via || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!v) return true;
  if (/topica|oftalmica|otica|gel|crema|unguento/.test(v)) return false;
  return /oral|intramuscular|intravenosa|sublingual|rectal|subcutanea/.test(v);
}

export function verificarAlertaSeguridad(nuevoMed, listaActual, editId = null) {
  if (!nuevoMed || !nuevoMed.nombre) return null;
  const nombreNuevo = String(nuevoMed.nombre || "").trim();
  const otros = (listaActual || []).filter((m) => m && m.id !== editId);
  if (!otros.length) return null;

  const sinAcento = (s) =>
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const raizFarmaco = (s) => {
    const norm = sinAcento(s)
      .replace(/\b(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|%)\b.*)/g, "")
      .trim();
    const palabras = norm.split(/\s+/).filter(Boolean);
    return palabras[0] || norm;
  };

  const nombreNorm = sinAcento(nombreNuevo);
  const raizNuevo = raizFarmaco(nombreNuevo);
  const viaNuevaSistemica = esViaSistemica(nuevoMed.via);
  const esAineNuevo = esAineTexto(nombreNorm) || esAineTexto(nuevoMed.presentacion);

  for (const item of otros) {
    const itemNorm = sinAcento(item.nombre);
    const raizItem = raizFarmaco(item.nombre);
    const esMismoPrincipio =
      nombreNorm === itemNorm ||
      (nombreNorm.length >= 6 && itemNorm.includes(nombreNorm)) ||
      (itemNorm.length >= 6 && nombreNorm.includes(itemNorm)) ||
      (raizNuevo && raizItem && raizNuevo.length >= 4 && raizNuevo === raizItem);

    if (esMismoPrincipio) {
      return {
        tipo: "duplicidad",
        titulo: "Duplicidad de principio activo",
        mensaje: `Ya agregaste ${item.nombre}. Evita prescribir el mismo fármaco dos veces o verifica la dosis acumulada.`,
      };
    }
    const esAineItem = esAineTexto(itemNorm) || esAineTexto(item.presentacion);
    const viaItemSistemica = esViaSistemica(item.via);
    if (esAineNuevo && esAineItem && viaNuevaSistemica && viaItemSistemica) {
      return {
        tipo: "aine",
        titulo: "Alerta: Asociación de AINEs",
        mensaje: `Ya prescribiste ${item.nombre}. Combinar dos AINEs sistémicos no mejora la analgesia y multiplica el riesgo de hemorragia digestiva y daño renal.`,
      };
    }
  }
  return null;
}
