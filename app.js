import { cie10Data, medicamentosData, examenesCatalogo } from "./catalogos.js";
import {
  cleanText,
  cleanMultiline,
  onlyDigits,
  validarEdad,
  validarDni,
  validarEmail,
  perfilListo,
  fileSlug,
} from "./sanitize.js";
import {
  buscarPacientes,
  calcularCantidad,
  dosisReferencia,
  indicacionesAutomaticas,
  pacientePorDni,
  verificarAlertaSeguridad,
  duracionMaximaTratamiento,
  fechaFinTratamiento,
  calcularDosisPediatrica,
} from "./automatizar.js";
import {
  TX_FRECUENTES_KEY,
  EXAM_PACKS_KEY,
  PRESETS_TRATAMIENTOS,
  PRESETS_EXAM_PACKS,
  TOP_DIAGNOSTICOS,
  PRESETS_PEDIATRICOS,
  obtenerTratamientosFrecuentes,
  guardarTratamientoFrecuente,
  eliminarTratamientoFrecuente,
  obtenerPacksExamenes,
  guardarPackExamenes,
  eliminarPackExamenes,
  aplicarTratamientoADraft,
  aplicarPackExamenesADraft,
} from "./frecuentes.js";
import {
  actualizarAcceso,
  crearAcceso,
  entrar,
  leerSesion,
  listarAccesos,
  salir,
} from "./auth.js";
import { claveEspecialidad, crearLogo } from "./marcas.js";
import { frasesRecomendadas } from "./recomendaciones.js";

const PERFIL_KEY = "recetapp.perfil";
const PACIENTES_KEY = "recetapp.pacientes";
const DRAFT_KEY = "recetapp.borrador";
const ULTIMA_KEY = "recetapp.ultima";
const HISTORIAL_KEY = "recetapp.historial";

const WIZARD = [
  { id: "paciente", titulo: "Paciente" },
  { id: "diagnostico", titulo: "Diagnóstico" },
  { id: "medicamentos", titulo: "Medicamentos" },
  { id: "indicaciones", titulo: "Indicaciones" },
  { id: "revision", titulo: "Revisión" },
];

const FRECUENCIAS = [
  "Cada 4 horas",
  "Cada 6 horas",
  "Cada 8 horas",
  "Cada 12 horas",
  "Cada 24 horas",
  "2 veces al día",
  "3 veces al día",
  "Según necesidad",
  "Dosis única",
];

const VIAS = [
  "Vía oral",
  "Vía sublingual",
  "Vía intramuscular",
  "Vía intravenosa",
  "Vía subcutánea",
  "Vía tópica",
  "Vía oftálmica",
  "Vía ótica",
  "Vía nasal",
  "Vía rectal",
  "Vía vaginal",
  "Vía vaginal/oral",
  "Vía transdérmica",
  "Vía intratecal",
  "Vía tópica capilar",
  "Vía infiltrativa",
  "Vía espinal / epidural",
  "Vía epidural",
  "Vía inhalatoria",
  "Vía intradérmica",
  "Inhalatoria",
  "Implante subdérmico",
  "Dispositivo intrauterino",
];

const TIPOS = [
  { id: "agudo", label: "Agudo" },
  { id: "crónico", label: "Crónico" },
  { id: "agudo sobre crónico", label: "Agudo sobre crónico" },
  { id: "recurrente", label: "Recurrente" },
  { id: "congénito", label: "Congénito" },
  { id: "traumático", label: "Traumático" },
  { id: "neoplásico", label: "Neoplásico" },
  { id: "síntoma", label: "Síntoma" },
  { id: "prevención", label: "Prevención" },
];

function etiquetaTipo(id) {
  return TIPOS.find((tipo) => tipo.id === id)?.label || "";
}

function sinAcento(texto) {
  return String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function puntajeDiagnostico(dx, term) {
  if (!term) return 1;
  const t = sinAcento(term);
  const desc = sinAcento(dx.descripcion);
  const alias = sinAcento(dx.alias);
  const grupo = sinAcento(dx.grupo);
  const sub = sinAcento(dx.subtipo);
  const tipo = sinAcento(etiquetaTipo(dx.tipo));
  const codigo = sinAcento(dx.codigo);
  const seguro = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`\\bsin\\s+${seguro}`).test(desc)) return 40;
  const palabras = desc.split(/[^a-z0-9]+/).filter(Boolean);
  const compuesta = palabras.some((word) => /^(bronco|hipo)/.test(word) && word.endsWith(t));
  const empieza = desc.startsWith(t) || palabras.some((word) => word === t || word.startsWith(t)) || compuesta;
  const especifica = /\bpor\b|\bdebida\b/.test(desc) && !/aspirativ|atipic/.test(desc);
  if (empieza && !especifica) return 100;
  if (empieza) return 92;
  if (new RegExp(`(?:^|[^a-z0-9])${seguro}`).test(desc)) return 60;
  const enAlias = alias.split(/[^a-z0-9]+/).some((word) => word === t || word.startsWith(t));
  if (enAlias) return 45;
  const borde = new RegExp(`(?:^|[^a-z0-9])${seguro}`);
  if (borde.test(grupo) || borde.test(sub)) return 30;
  if (codigo.startsWith(t) || tipo.includes(t)) return 15;
  return -1;
}

function detalleDiagnostico(dx) {
  const d = sinAcento(dx.descripcion);
  let peso = d.length;
  if (/no especificad/.test(d)) peso -= 40;
  if (/\b(lobar|bronconeumon\w*|aspirativ\w*|atipic\w*|bacterian\w*|viral|congenit\w*)\b/.test(d)) peso -= 12;
  if (/\bpor\b|\bdebida\b/.test(d)) peso += 28;
  return peso;
}

function ordenarDiagnosticos(items) {
  const altos = items.filter((item) => item.score >= 80);
  const base = altos.length ? altos : items;
  const cuentas = new Map();
  for (const item of base) {
    const cap = item.dx.codigo[0];
    cuentas.set(cap, (cuentas.get(cap) || 0) + 1);
  }
  let dominante = "";
  let mejor = 0;
  for (const [cap, n] of cuentas) {
    if (n > mejor) {
      dominante = cap;
      mejor = n;
    }
  }
  return items.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const detalle = detalleDiagnostico(a.dx) - detalleDiagnostico(b.dx);
    if (detalle) return detalle;
    const ap = a.dx.codigo[0] === dominante ? 0 : 1;
    const bp = b.dx.codigo[0] === dominante ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return a.dx.codigo.localeCompare(b.dx.codigo, "es");
  });
}

const MARCAS_PERU = [
  "Panadol", "Velamox", "Clamoxin", "Augmentin", "Zitromax", "Ciproxina",
  "Cozaar", "Metforal", "Voltaren", "Apronax", "Rocephin", "Ventolin",
  "Losapress", "Lipitor", "Zoloft", "Dalacin C", "Flagyl",
];

const emptyPerfil = () => ({
  nombre: "",
  cmp: "",
  especialidad: "",
  telefono: "",
  email: "",
  firmaSello: "",
  rubricaAjuste: {
    offsetX: 0,
    offsetY: 0,
    escala: 1,
  },
  tema: "auto",
});

function emptyDraft() {
  return {
    screen: "paciente",
    pacienteNombre: "",
    pacienteDNI: "",
    pacienteEdad: "",
    pacienteSexo: "",
    fechaAtencion: todayISO(),
    horaAtencion: nowTime(),
    diagnostico: "",
    cie10: "",
    proximoControl: "",
    dxQuery: "",
    medicamentos: [],
    examenes: [],
    indicacionesGenerales: "",
  };
}

function emptyMedForm() {
  return {
    q: "",
    nombre: "",
    presentacion: "",
    cantidad: "",
    dosis: "",
    frecuencia: "",
    dias: "",
    duracion: "",
    via: "",
    indicaciones: "",
  };
}

let perfil = loadPerfil();
let draft = loadDraft();
let screen = "login";
let panel = "paciente";
let enfocarDni = false;
let cuenta = null;
let accesos = [];
let adminAbierto = "";
let adminQuery = "";
let loginUsuario = "";
let loginClave = "";
let composer = null;
let medForm = emptyMedForm();
let medEditId = null;
let cambiandoMed = false;
let examQuery = "";
let examNombre = "";
let examEditId = null;
let examTipo = "Laboratorio";
let dialog = null;
let dialogResolver = null;
let busy = false;
let formError = "";
let afterPerfil = "inicio";
let origenExamenes = "receta";
let origenPrevia = "receta";
let ultimoEmitido = null;
let txQuery = "";
let modalActivo = null; // "tx-frecuentes" | "guardar-tx" | "calc-pediatrica" | "packs-examenes" | "guardar-pack"
let itemAGuardarTx = null; // Puede ser un item del historial o emitido
let calcState = {
  presetId: "paracetamol-gotas",
  pesoKg: "12",
  mgKgDia: "45",
  tomasDia: "3",
  frecuencia: "Cada 8 horas",
  duracion: "3 días",
  concMg: "100",
  concMl: "1",
  nombreMed: "Paracetamol",
  presentacion: "100 mg / 1 mL gotas",
  via: "Vía oral",
  indicacion: "Administrar en caso de fiebre > 38°C o dolor.",
};

const root = document.getElementById("app");

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = String(value);
    else if (key === "disabled") node.disabled = true;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else node.setAttribute(key, String(value));
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

function icono(nombre) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "ico");
  svg.setAttribute("aria-hidden", "true");
  const trazo = (d) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.8");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.append(path);
  };
  if (nombre === "plus") trazo("M12 5v14M5 12h14");
  else if (nombre === "check") trazo("M5 12.5 9.5 17 19 7");
  else if (nombre === "pencil") {
    trazo("M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z");
    trazo("M13.5 6.5l4 4");
  } else if (nombre === "doc") {
    trazo("M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z");
    trazo("M14 2v6h6");
    trazo("M9 13h6");
    trazo("M9 17h3");
  } else if (nombre === "flask") {
    trazo("M10 2v7.5l-4.5 8a2 2 0 0 0 1.7 3h9.6a2 2 0 0 0 1.7-3l-4.5-8V2");
    trazo("M8.5 2h7");
    trazo("M7 16h10");
  } else if (nombre === "user") {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "7");
    circle.setAttribute("r", "4");
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "currentColor");
    circle.setAttribute("stroke-width", "1.8");
    svg.append(circle);
    trazo("M5.5 21a6.5 6.5 0 0 1 13 0");
  } else if (nombre === "shield") {
    trazo("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z");
  } else if (nombre === "logout") {
    trazo("M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4");
    trazo("M16 17l5-5-5-5");
    trazo("M21 12H9");
  } else if (nombre === "clock") {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "9");
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "currentColor");
    circle.setAttribute("stroke-width", "1.8");
    svg.append(circle);
    trazo("M12 7v5l3 3");
  } else if (nombre === "eye") {
    trazo("M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z");
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "3");
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "currentColor");
    circle.setAttribute("stroke-width", "1.8");
    svg.append(circle);
  } else if (nombre === "share") {
    trazo("M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8");
    trazo("M16 6l-4-4-4 4");
    trazo("M12 2v13");
  } else if (nombre === "whatsapp") {
    trazo("M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z");
  } else if (nombre === "bookmark") {
    trazo("M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z");
  } else if (nombre === "calc") {
    trazo("M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z");
    trazo("M8 9h8");
    trazo("M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01M16 17h.01");
  } else if (nombre === "layers") {
    trazo("M12 2L2 7l10 5 10-5-10-5z");
    trazo("M2 17l10 5 10-5");
    trazo("M2 12l10 5 10-5");
  } else {
    trazo("M5 7h14");
    trazo("M9 7V5h6v2");
    trazo("M7 7l1 13h8l1-13");
  }
  return svg;
}

function iconBtn(nombre, label, onclick, extra = "") {
  return el("button", {
    type: "button",
    class: `icon-act${extra ? ` ${extra}` : ""}`,
    "aria-label": label,
    title: label,
    onclick,
  }, [icono(nombre)]);
}

function botonMas(label, onclick) {
  return el("button", {
    type: "button",
    class: "icon-add",
    "aria-label": label,
    title: label,
    onclick,
  }, [icono("plus")]);
}

function sanitizeRubricaAjuste(ajuste) {
  const x = Number(ajuste?.offsetX);
  const y = Number(ajuste?.offsetY);
  const esc = Number(ajuste?.escala);
  return {
    offsetX: Number.isFinite(x) ? Math.max(-40, Math.min(40, Math.round(x))) : 0,
    offsetY: Number.isFinite(y) ? Math.max(-30, Math.min(30, Math.round(y))) : 0,
    escala: Number.isFinite(esc) ? Math.max(0.6, Math.min(1.8, Math.round(esc * 100) / 100)) : 1,
  };
}

function loadPerfil() {
  try {
    const raw = JSON.parse(localStorage.getItem(PERFIL_KEY) || "null");
    if (!raw || typeof raw !== "object") return emptyPerfil();
    return {
      nombre: cleanText(raw.nombre, 120),
      cmp: cleanText(raw.cmp, 20),
      especialidad: cleanText(raw.especialidad, 80),
      telefono: cleanText(raw.telefono, 20),
      email: cleanText(raw.email, 120),
      firmaSello: typeof raw.firmaSello === "string" && raw.firmaSello.startsWith("data:image/") ? raw.firmaSello : "",
      rubricaAjuste: sanitizeRubricaAjuste(raw.rubricaAjuste),
      tema: ["auto", "light", "dark"].includes(raw.tema) ? raw.tema : "auto",
    };
  } catch {
    return emptyPerfil();
  }
}

function aplicarTema(tema) {
  if (typeof document === "undefined") return;
  if (tema === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else if (tema === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

function sanitizeMed(item) {
  if (!item || typeof item !== "object") return null;
  const med = {
    id: Number(item.id) || Date.now(),
    nombre: cleanText(item.nombre, 120),
    presentacion: cleanText(item.presentacion, 80),
    cantidad: cleanText(item.cantidad, 40),
    dosis: cleanText(item.dosis, 40),
    frecuencia: FRECUENCIAS.includes(item.frecuencia) ? item.frecuencia : "",
    duracion: cleanText(item.duracion, 40),
    via: VIAS.includes(item.via) ? item.via : "",
    indicaciones: cleanText(item.indicaciones, 240),
  };
  if (!med.nombre || !med.presentacion || !med.cantidad || !med.dosis || !med.frecuencia || !med.duracion || !med.via) {
    return null;
  }
  return med;
}

function catalogExam(nombre) {
  const buscado = sinAcento(nombre).trim();
  return examenesCatalogo.find((ex) => sinAcento(ex.nombre) === buscado) || null;
}

function tipoOrdenExamen(tipo) {
  return tipo === "Laboratorio" ? "Laboratorio" : "Imágenes";
}

function sanitizeExam(item) {
  if (!item || typeof item !== "object") return null;
  const nombre = cleanText(item.nombre, 160);
  if (!nombre) return null;
  const catalogo = catalogExam(nombre);
  return {
    id: Number(item.id) || Date.now(),
    nombre,
    tipo: tipoOrdenExamen(cleanText(item.tipo || catalogo?.tipo, 40)),
    grupo: cleanText(item.grupo || catalogo?.grupo, 80),
    indicaciones: cleanText(item.indicaciones || catalogo?.indicacionesSug, 300),
  };
}

function loadDraft() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
    if (!raw || typeof raw !== "object") return emptyDraft();
    const base = emptyDraft();
    base.pacienteNombre = cleanText(raw.pacienteNombre, 120);
    base.pacienteDNI = onlyDigits(raw.pacienteDNI, 8);
    base.pacienteEdad = onlyDigits(raw.pacienteEdad, 3);
    base.pacienteSexo = ["M", "F"].includes(raw.pacienteSexo) ? raw.pacienteSexo : "";
    base.fechaAtencion = /^\d{4}-\d{2}-\d{2}$/.test(raw.fechaAtencion || "") ? raw.fechaAtencion : base.fechaAtencion;
    base.horaAtencion = /^\d{2}:\d{2}$/.test(raw.horaAtencion || "") ? raw.horaAtencion : base.horaAtencion;
    base.diagnostico = cleanText(raw.diagnostico, 180);
    base.cie10 = /^[A-Z][0-9]{2}(?:\.[0-9A-Z]{1,4})?$/i.test(raw.cie10 || "") ? String(raw.cie10).toUpperCase() : "";
    if (!base.cie10) {
      const hallado = base.diagnostico.match(/^([A-Z]\d{2}(?:\.[0-9A-Z]{1,4})?)\s*-\s*(.+)$/i);
      if (hallado) {
        base.cie10 = hallado[1].toUpperCase();
        base.diagnostico = cleanText(hallado[2], 180);
      }
    }
    base.proximoControl = /^\d{4}-\d{2}-\d{2}$/.test(raw.proximoControl || "") ? raw.proximoControl : "";
    base.dxQuery = cleanText(raw.dxQuery, 80);
    base.indicacionesGenerales = cleanMultiline(raw.indicacionesGenerales, 800);
    base.medicamentos = Array.isArray(raw.medicamentos) ? raw.medicamentos.map(sanitizeMed).filter(Boolean).slice(0, 30) : [];
    base.examenes = Array.isArray(raw.examenes)
      ? raw.examenes.map(sanitizeExam).filter(Boolean).slice(0, 30)
      : [];
    base.screen = WIZARD.some((step) => step.id === raw.screen) ? raw.screen : "paciente";
    return base;
  } catch {
    return emptyDraft();
  }
}

function savePerfil() {
  localStorage.setItem(PERFIL_KEY, JSON.stringify(perfil));
}

function saveDraft() {
  if (WIZARD.some((step) => step.id === screen)) draft.screen = screen;
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function todayISO() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function wizardIndex() {
  return WIZARD.findIndex((step) => step.id === screen);
}

function hasMeaningfulDraft() {
  return Boolean(
    draft.pacienteNombre ||
    draft.diagnostico ||
    draft.indicacionesGenerales ||
    draft.medicamentos.length ||
    draft.examenes.length
  );
}

function initials(nombre) {
  const parts = cleanText(nombre, 120).split(" ").filter(Boolean);
  if (!parts.length) return "Dr";
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join("");
}

function render() {
  const escritorio = screen === "inicio" || screen === "login";
  const shell = el("div", { class: escritorio ? "shell shell-desk" : "shell shell-flow" }, [
    escritorio ? null : header(),
    el("main", { class: escritorio ? "main main-desk" : "main" }, [view()]),
    footer(),
  ]);
  if (dialog) shell.append(dialogNode());
  if (modalActivo) shell.append(modalNode());
  root.replaceChildren(shell);
  if (formError) showError(formError);
}

function header() {
  const index = wizardIndex();
  let title = "RecetAPP";
  let kicker = "";
  let onBack = null;
  if (screen === "login") {
    title = "RecetAPP";
  } else if (screen === "receta") {
    title = "Receta";
    onBack = () => goto("inicio");
  } else if (screen === "examenes") {
    title = "Orden de exámenes";
    onBack = () => goto(origenExamenes || "receta");
  } else if (screen === "admin") {
    title = "Admin";
    onBack = () => goto("inicio");
  } else if (screen === "perfil") {
    title = "Perfil";
    onBack = () => leavePerfil(false);
  } else if (screen === "listo") {
    title = "Listo";
    onBack = () => goto("inicio");
  } else if (screen === "historial") {
    title = "Historial";
    onBack = () => goto("inicio");
  } else if (screen === "previa") {
    title = "Vista previa";
    onBack = () => goto(origenPrevia || "receta");
  } else if (index >= 0) {
    if (composer === "med") title = "Medicamento";
    else if (composer === "exam") title = "Examen";
    else title = WIZARD[index].titulo;
    kicker = `${index + 1} / ${WIZARD.length}`;
    onBack = () => {
      if (composer) {
        composer = null;
        render();
        return;
      }
      goto(index === 0 ? "inicio" : WIZARD[index - 1].id);
    };
  }
  const progress = index >= 0 && !composer
    ? el("div", {
      class: "progress",
      role: "progressbar",
      "data-step": String(index + 1),
      "aria-valuemin": "1",
      "aria-valuemax": String(WIZARD.length),
      "aria-valuenow": String(index + 1),
      "aria-label": "Avance de la receta",
    }, [el("span")])
    : null;
  return el("header", { class: "top" }, [
    el("div", { class: "top-row" }, [
      onBack ? el("button", { type: "button", class: "icon-btn", "aria-label": "Volver", onclick: onBack }, ["←"]) : null,
      crearLogo(claveEspecialidad(perfil.especialidad)),
      el("div", {}, [
        el("h1", { text: title }),
        kicker ? el("p", { class: "step-label", text: kicker }) : null,
      ]),
    ]),
    progress,
  ]);
}

function footer() {
  if (screen === "inicio" || screen === "listo" || screen === "admin" || screen === "historial") return null;
  if (screen === "previa") {
    const esReceta = origenPrevia === "receta";
    return el("footer", { class: "footer footer-split" }, [
      el("button", {
        type: "button",
        class: "btn ghost",
        onclick: () => goto(origenPrevia || "receta"),
      }, ["Volver a editar"]),
      el("button", {
        type: "button",
        class: "btn is-primary btn-aprobar-documento",
        disabled: busy,
        onclick: esReceta ? generarPDF : generarOrdenExamenes,
      }, [busy ? "Aprobando…" : esReceta ? "✓ Aprobar y Emitir Receta" : "✓ Aprobar y Emitir Orden"]),
    ]);
  }
  if (screen === "receta") {
    const agregando = composer === "med";
    if (agregando) {
      const button = el("button", {
        type: "button",
        class: "btn has-icon",
        disabled: busy,
        "aria-label": "Agregar",
        onclick: commitMed,
      });
      button.append(icono("check"));
      return el("footer", { class: "footer" }, [button]);
    }
    return el("footer", { class: "footer footer-split" }, [
      el("button", {
        type: "button",
        class: "btn ghost",
        disabled: busy || !draft.medicamentos.length,
        onclick: () => abrirPrevia("receta"),
      }, ["Vista previa"]),
      el("button", {
        type: "button",
        class: "btn",
        disabled: busy,
        "aria-label": busy ? "Generando…" : "Generar PDF",
        onclick: generarPDF,
      }, [busy ? "Generando…" : "Generar PDF"]),
    ]);
  }
  if (screen === "examenes") {
    const agregando = composer === "exam";
    if (agregando) {
      const button = el("button", {
        type: "button",
        class: "btn has-icon",
        disabled: busy,
        "aria-label": "Agregar",
        onclick: commitExam,
      });
      button.append(icono("check"));
      return el("footer", { class: "footer" }, [button]);
    }
    return el("footer", { class: "footer footer-split" }, [
      el("button", {
        type: "button",
        class: "btn ghost",
        disabled: busy || !draft.examenes.length,
        onclick: () => abrirPrevia("examenes"),
      }, ["Vista previa"]),
      el("button", {
        type: "button",
        class: "btn",
        disabled: busy || !draft.examenes.length,
        "aria-label": busy ? "Generando…" : "Generar orden PDF",
        onclick: generarOrdenExamenes,
      }, [busy ? "Generando…" : "Generar orden PDF"]),
    ]);
  }
  if (screen === "login") return null;
  let label = "Continuar";
  let action = next;
  if (screen === "perfil") {
    label = "Guardar";
    action = savePerfilFromForm;
  } else if (composer === "med") {
    label = "Agregar";
    action = commitMed;
  } else if (screen === "indicaciones") label = "Revisar";
  else if (screen === "revision") {
    label = busy ? "Generando…" : "Generar PDF";
    action = generarPDF;
  }
  const confirmar = label === "Agregar";
  const button = el("button", {
    type: "button",
    class: label === "Omitir" ? "btn ghost" : confirmar ? "btn has-icon" : "btn",
    disabled: busy,
    "aria-label": label,
    onclick: action,
  });
  if (confirmar) button.append(icono("check"));
  else button.textContent = label;
  return el("footer", { class: "footer" }, [button]);
}

function view() {
  if (screen === "login") return viewLogin();
  if (screen === "admin") return viewAdmin();
  if (screen === "receta") return viewBoard();
  if (screen === "inicio") return viewInicio();
  if (screen === "perfil") return viewPerfil();
  if (screen === "listo") return viewListo();
  if (screen === "historial") return viewHistorial();
  if (screen === "previa") return viewPrevia();
  if (screen === "paciente") return viewPaciente();
  if (screen === "diagnostico") return viewDiagnostico();
  if (screen === "medicamentos") return composer === "med" ? viewMedComposer() : viewMedicamentos();
  if (screen === "examenes") return viewOrdenExamenes();
  if (screen === "indicaciones") return viewIndicaciones();
  if (screen === "revision") return viewRevision();
  return viewInicio();
}

function errorSlot() {
  return el("p", { id: "form-error", class: "banner", role: "alert", hidden: true });
}

function showError(message) {
  formError = message || "";
  const node = document.getElementById("form-error");
  if (!node) return;
  node.hidden = !formError;
  node.textContent = formError;
}

function fechaEscritorio() {
  return new Date().toLocaleDateString("es-PE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).replace(/\./g, "").replace(/,/g, "");
}

function fechaLegible(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return "";
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).replace(/\./g, "").replace(/ de /g, " ");
}

function deskMark(animado = false) {
  return el("div", { class: "desk-mark" }, [
    crearLogo(claveEspecialidad(perfil.especialidad), animado),
    el("div", { class: "wordmark", text: "RecetAPP" }),
  ]);
}

let accesoPresentado = false;

function enfocarAcceso() {
  if (!window.matchMedia("(pointer: fine)").matches) return;
  document.getElementById(loginUsuario ? "login-clave" : "login-usuario")?.focus();
}

function presentarAcceso(section) {
  const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (accesoPresentado || reducir) {
    accesoPresentado = true;
    section.classList.add("is-ready");
    queueMicrotask(enfocarAcceso);
    return;
  }
  window.setTimeout(() => {
    accesoPresentado = true;
    section.classList.add("is-ready");
    enfocarAcceso();
  }, 1500);
}

function viewLogin() {
  const usuario = el("input", {
    id: "login-usuario",
    type: "text",
    name: "username",
    autocomplete: "username",
    autocapitalize: "none",
    spellcheck: "false",
    maxlength: "40",
    value: loginUsuario,
  });
  usuario.addEventListener("input", () => {
    loginUsuario = cleanText(usuario.value, 40);
  });
  const clave = el("input", {
    id: "login-clave",
    type: "password",
    name: "password",
    autocomplete: "current-password",
    maxlength: "80",
    value: loginClave,
  });
  clave.addEventListener("input", () => {
    loginClave = clave.value.slice(0, 80);
  });
  clave.addEventListener("keydown", (event) => {
    if (event.key === "Enter") enviarLogin();
  });
  const section = el("section", { class: "screen desk desk-lock" }, [
    el("div", { class: "desk-hero" }, [
      el("div", { class: "desk-hero-inner" }, [
        deskMark(true),
        el("p", { class: "desk-date", text: fechaEscritorio() }),
        el("h1", { class: "desk-name", text: "Acceso" }),
      ]),
    ]),
    el("div", { class: "desk-panel" }, [
      el("div", { class: "desk-card stack" }, [
        errorSlot(),
        el("label", { class: "field", text: "Usuario" }, [usuario]),
        el("label", { class: "field", text: "Contraseña" }, [clave]),
        el("button", {
          type: "button",
          class: "btn",
          disabled: busy,
          onclick: enviarLogin,
        }, [busy ? "Ingresando…" : "Ingresar"]),
      ]),
    ]),
  ]);
  queueMicrotask(() => presentarAcceso(section));
  return section;
}

async function enviarLogin() {
  if (busy) return;
  busy = true;
  showError("");
  render();
  const resultado = await entrar(loginUsuario, loginClave);
  busy = false;
  if (!resultado.ok) {
    loginClave = "";
    showError(resultado.error);
    render();
    return;
  }
  cuenta = resultado.cuenta;
  loginClave = "";
  screen = "inicio";
  render();
}

function viewAdmin() {
  const consulta = adminQuery.trim().toLowerCase();
  const visibles = accesos.filter((item) => {
    const texto = `${item.nombre || ""} ${item.username || ""}`.toLowerCase();
    return !consulta || texto.includes(consulta);
  }).slice(0, 4);
  const buscar = el("input", {
    id: "admin-q",
    type: "search",
    value: adminQuery,
    maxlength: "40",
    autocomplete: "off",
    placeholder: "",
  });
  buscar.addEventListener("input", () => {
    adminQuery = cleanText(buscar.value, 40);
    render();
    document.getElementById("admin-q")?.focus();
  });
  const filas = visibles.map((item) => {
    const abierto = adminAbierto === item.id;
    const vence = el("input", {
      type: "date",
      value: item.exp_at ? String(item.exp_at).slice(0, 10) : "",
    });
    return el("section", { class: abierto ? "fold is-open" : "fold" }, [
      el("button", {
        type: "button",
        class: "fold-head",
        "aria-expanded": abierto ? "true" : "false",
        onclick: () => {
          adminAbierto = abierto ? "" : item.id;
          render();
        },
      }, [
        el("span", { class: "fold-title", text: item.nombre || item.username }),
        el("span", { class: "fold-sum", text: item.active === false ? "Suspendido" : item.username }),
        el("span", { class: "fold-chev", "aria-hidden": "true", text: "›" }),
      ]),
      el("div", { class: "fold-body" }, [
        el("div", { class: "fold-inner stack" }, abierto ? [
          el("button", {
            type: "button",
            class: item.active === false ? "link" : "text-danger",
            onclick: () => cambiarAcceso(item, { active: item.active === false }),
          }, [item.active === false ? "Activar" : "Suspender"]),
          el("label", { class: "field", text: "Vence" }, [vence]),
          el("button", {
            type: "button",
            class: "add-btn",
            onclick: () => cambiarAcceso(item, { exp_at: vence.value ? new Date(`${vence.value}T23:59:59`).toISOString() : null }),
          }, ["Guardar"]),
        ] : []),
      ]),
    ]);
  });
  const nuevoAbierto = adminAbierto === "nuevo";
  const usuario = el("input", { id: "nuevo-usuario", type: "text", maxlength: "40", autocomplete: "off" });
  const nombre = el("input", { id: "nuevo-nombre", type: "text", maxlength: "120", autocomplete: "name" });
  const clave = el("input", { id: "nuevo-clave", type: "password", maxlength: "80", autocomplete: "new-password" });
  const venceNuevo = el("input", { id: "nuevo-vence", type: "date" });
  return el("div", { class: "board" }, [
    errorSlot(),
    el("label", { class: "field", text: "Buscar" }, [buscar]),
    ...filas,
    accesos.length ? null : el("p", { class: "muted", text: "Sin accesos" }),
    el("section", { class: nuevoAbierto ? "fold is-open" : "fold" }, [
      el("button", {
        type: "button",
        class: "fold-head",
        "aria-expanded": nuevoAbierto ? "true" : "false",
        onclick: () => {
          adminAbierto = nuevoAbierto ? "" : "nuevo";
          render();
        },
      }, [
        el("span", { class: "fold-title", text: "Nuevo" }),
        el("span", { class: "fold-chev", "aria-hidden": "true", text: "›" }),
      ]),
      el("div", { class: "fold-body" }, [
        el("div", { class: "fold-inner stack" }, nuevoAbierto ? [
          el("label", { class: "field", text: "Usuario" }, [usuario]),
          el("label", { class: "field", text: "Nombre" }, [nombre]),
          el("label", { class: "field", text: "Contraseña" }, [clave]),
          el("label", { class: "field", text: "Vence" }, [venceNuevo]),
          el("button", { type: "button", class: "add-btn", onclick: agregarAcceso }, ["Agregar"]),
        ] : []),
      ]),
    ]),
  ]);
}

async function cambiarAcceso(item, cambios) {
  if (busy) return;
  busy = true;
  render();
  try {
    await actualizarAcceso(item.id, cambios);
    accesos = await listarAccesos();
    showError("");
  } catch (error) {
    showError(error.message || "No se pudo guardar.");
  } finally {
    busy = false;
    if (screen === "admin") render();
  }
}

async function agregarAcceso() {
  if (busy) return;
  busy = true;
  render();
  try {
    await crearAcceso({
      usuario: document.getElementById("nuevo-usuario")?.value || "",
      nombre: document.getElementById("nuevo-nombre")?.value || "",
      password: document.getElementById("nuevo-clave")?.value || "",
      vence: document.getElementById("nuevo-vence")?.value
        ? new Date(`${document.getElementById("nuevo-vence").value}T23:59:59`).toISOString()
        : null,
    });
    accesos = await listarAccesos();
    showError("");
  } catch (error) {
    showError(error.message || "No se pudo crear.");
  } finally {
    busy = false;
    if (screen === "admin") render();
  }
}

async function abrirAdmin() {
  accesos = [];
  screen = "admin";
  formError = "";
  render();
  try {
    accesos = await listarAccesos();
  } catch (error) {
    showError(error.message || "No se pudo cargar.");
  }
  if (screen === "admin") render();
}

async function salirDeLaApp() {
  await salir();
  cuenta = null;
  loginUsuario = "";
  loginClave = "";
  screen = "login";
  render();
}

function leerUltima() {
  try {
    const raw = JSON.parse(localStorage.getItem(ULTIMA_KEY) || "null");
    if (!raw || typeof raw !== "object") return null;
    const entrada = {
      nombre: cleanText(raw.nombre, 120),
      dni: onlyDigits(raw.dni, 8),
      edad: onlyDigits(raw.edad, 3),
      sexo: ["M", "F"].includes(raw.sexo) ? raw.sexo : "",
      diagnostico: cleanText(raw.diagnostico, 180),
      cuando: /^\d{4}-\d{2}-\d{2}$/.test(raw.cuando || "") ? raw.cuando : "",
    };
    return entrada.nombre || entrada.diagnostico ? entrada : null;
  } catch {
    return null;
  }
}

function leerHistorial() {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORIAL_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function guardarHistorialItem(item) {
  try {
    const list = leerHistorial();
    const filtrada = list.filter((i) => !(i.dni && i.dni === item.dni && i.cuando === item.cuando && i.tipo === item.tipo));
    filtrada.unshift(item);
    localStorage.setItem(HISTORIAL_KEY, JSON.stringify(filtrada.slice(0, 15)));
  } catch {}
}

function borrarHistorial() {
  localStorage.removeItem(HISTORIAL_KEY);
  render();
}

function guardarUltima() {
  localStorage.setItem(ULTIMA_KEY, JSON.stringify({
    nombre: draft.pacienteNombre,
    dni: draft.pacienteDNI,
    edad: draft.pacienteEdad,
    sexo: draft.pacienteSexo,
    diagnostico: [draft.cie10, draft.diagnostico].filter(Boolean).join(" — "),
    cuando: draft.fechaAtencion || todayISO(),
  }));
  guardarHistorialItem({
    id: String(Date.now()),
    tipo: draft.examenes.length && !draft.medicamentos.length ? "orden" : "receta",
    nombre: draft.pacienteNombre,
    dni: draft.pacienteDNI,
    edad: draft.pacienteEdad,
    sexo: draft.pacienteSexo,
    diagnostico: draft.diagnostico,
    cie10: draft.cie10,
    cuando: draft.fechaAtencion || todayISO(),
    hora: draft.horaAtencion || nowTime(),
    medicamentos: draft.medicamentos.map((m) => ({ ...m })),
    examenes: draft.examenes.map((e) => ({ ...e })),
    indicacionesGenerales: draft.indicacionesGenerales,
    proximoControl: draft.proximoControl,
  });
}

async function repetirPaciente(entrada) {
  if (hasMeaningfulDraft()) {
    const ok = await ask("Borrador", "Se descartará.", "Empezar");
    if (!ok) return;
  }
  draft = emptyDraft();
  draft.pacienteNombre = entrada.nombre;
  draft.pacienteDNI = entrada.dni;
  draft.pacienteEdad = entrada.edad;
  draft.pacienteSexo = entrada.sexo;
  composer = null;
  saveDraft();
  goto("paciente");
}

function tarjetaReceta(etiqueta, nombre, detalle, onclick) {
  return el("button", { type: "button", class: "desk-draft", onclick }, [
    el("span", { class: "desk-draft-label", text: etiqueta }),
    el("span", { class: "desk-draft-copy" }, [
      el("span", { class: "desk-draft-name", text: nombre }),
      detalle ? el("span", { class: "desk-draft-sub", text: detalle }) : null,
    ]),
  ]);
}

function viewInicio() {
  const meta = [perfil.especialidad, perfil.cmp ? `CMP ${perfil.cmp}` : ""].filter(Boolean).join(" · ");
  const ultima = leerUltima();
  const detalleBorrador = [
    [draft.cie10, draft.diagnostico].filter(Boolean).join(" — "),
    draft.medicamentos.length ? `${draft.medicamentos.length} med` : "",
    draft.examenes.length ? `${draft.examenes.length} ex` : "",
  ].filter(Boolean).join(" · ");
  const detalleUltima = [fechaLegible(ultima?.cuando), ultima?.diagnostico].filter(Boolean).join(" · ");

  let estadoCard;
  if (hasMeaningfulDraft()) {
    estadoCard = el("button", {
      type: "button",
      class: "desk-status-card",
      onclick: resume,
    }, [
      el("span", { class: "desk-status-badge amber" }, [
        el("span", { class: "desk-status-dot" }),
        document.createTextNode("Borrador en curso"),
      ]),
      el("p", { class: "desk-status-title", text: draft.pacienteNombre || "Paciente no especificado" }),
      el("p", { class: "desk-status-text", text: detalleBorrador || "Borrador activo listo para continuar." }),
      el("div", { class: "desk-status-action" }, [
        el("span", { text: "Continuar edición" }),
        el("span", { text: "→" }),
      ]),
    ]);
  } else if (ultima) {
    estadoCard = el("button", {
      type: "button",
      class: "desk-status-card",
      onclick: () => repetirPaciente(ultima),
    }, [
      el("span", { class: "desk-status-badge blue" }, [
        el("span", { class: "desk-status-dot" }),
        document.createTextNode("Última atención emitida"),
      ]),
      el("p", { class: "desk-status-title", text: ultima.nombre || "Paciente" }),
      el("p", { class: "desk-status-text", text: detalleUltima || "Atención previa registrada." }),
      el("div", { class: "desk-status-action" }, [
        el("span", { text: "Nueva atención con este paciente" }),
        el("span", { text: "→" }),
      ]),
    ]);
  } else {
    estadoCard = el("div", { class: "desk-status-card" }, [
      el("span", { class: "desk-status-badge" }, [
        el("span", { class: "desk-status-dot" }),
        document.createTextNode("Consultorio activo"),
      ]),
      el("p", { class: "desk-status-title", text: "Prescripción médica lista" }),
      el("p", { class: "desk-status-text", text: "Catálogos clínicos y vademécum preparados para emitir recetas y órdenes médicas." }),
      el("div", { class: "desk-stats-grid" }, [
        el("div", { class: "desk-stat-item" }, [
          el("span", { class: "desk-stat-num", text: "2,598" }),
          el("span", { class: "desk-stat-label", text: "CIE-10" }),
        ]),
        el("div", { class: "desk-stat-item" }, [
          el("span", { class: "desk-stat-num", text: "1,084" }),
          el("span", { class: "desk-stat-label", text: "Fármacos" }),
        ]),
        el("div", { class: "desk-stat-item" }, [
          el("span", { class: "desk-stat-num", text: "280+" }),
          el("span", { class: "desk-stat-label", text: "Exámenes" }),
        ]),
      ]),
    ]);
  }

  const historialItems = leerHistorial();
  const rail = [
    el("button", { type: "button", onclick: () => goto("historial") }, [
      icono("clock"),
      el("span", { text: historialItems.length ? `Historial (${historialItems.length})` : "Historial" }),
    ]),
    el("button", { type: "button", onclick: () => openPerfil("inicio") }, [
      icono("user"),
      el("span", { text: "Perfil" }),
    ]),
    cuenta?.isAdmin ? el("button", { type: "button", onclick: abrirAdmin }, [
      icono("shield"),
      el("span", { text: "Admin" }),
    ]) : null,
    el("button", { type: "button", onclick: salirDeLaApp }, [
      icono("logout"),
      el("span", { text: "Salir" }),
    ]),
  ].filter(Boolean);

  return el("section", { class: "screen desk desk-home" }, [
    el("div", { class: "desk-hero" }, [
      el("div", { class: "desk-hero-inner" }, [
        deskMark(),
        el("button", { type: "button", class: "desk-id", onclick: () => openPerfil("inicio") }, [
          el("p", { class: "desk-date", text: fechaEscritorio() }),
          el("h1", { class: "desk-name", text: perfil.nombre || "Perfil" }),
          meta ? el("p", { class: "desk-meta", text: meta }) : null,
        ]),
      ]),
    ]),
    el("div", { class: "desk-panel" }, [
      el("div", { class: "desk-home-actions" }, [
        el("div", { class: "desk-main-actions" }, [
          el("button", { type: "button", class: "desk-action-card primary", onclick: startNew }, [
            el("span", { class: "desk-action-icon" }, [icono("doc")]),
            el("span", { class: "desk-action-body" }, [
              el("span", { class: "desk-action-title", text: "Nueva receta" }),
              el("span", { class: "desk-action-desc", text: "Fármacos, dosis e indicaciones" }),
            ]),
            el("span", { class: "desk-action-arrow", "aria-hidden": "true", text: "→" }),
          ]),
          el("button", {
            type: "button",
            class: "desk-action-card",
            onclick: () => {
              origenExamenes = "inicio";
              goto("examenes");
            },
          }, [
            el("span", { class: "desk-action-icon" }, [icono("flask")]),
            el("span", { class: "desk-action-body" }, [
              el("span", { class: "desk-action-title", text: "Orden de exámenes" }),
              el("span", { class: "desk-action-desc", text: "Laboratorio, imágenes y estudios" }),
            ]),
            el("span", { class: "desk-action-arrow", "aria-hidden": "true", text: "→" }),
          ]),
        ]),
        estadoCard,
        el("nav", { class: "desk-rail-dock", "aria-label": "Cuenta" }, rail),
      ]),
    ]),
  ]);
}

function viewPerfil() {
  const fileInput = el("input", {
    type: "file",
    id: "p-firma-file",
    accept: "image/png,image/jpeg,image/webp",
    style: "display: none;",
  });
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 400;
        const maxH = 200;
        const scale = Math.min(1, maxW / img.width, maxH / img.height);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        perfil.firmaSello = canvas.toDataURL("image/png");
        render();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  let firmaBox;
  if (perfil.firmaSello) {
    const previewImg = document.createElement("img");
    previewImg.src = perfil.firmaSello;
    previewImg.alt = "Rúbrica y Sello";
    previewImg.className = "firma-preview-img";
    firmaBox = el("div", { class: "firma-container has-firma" }, [
      previewImg,
      el("p", { class: "muted", style: "font-size: 11.5px; margin: 0;", text: "Rúbrica/sello cargado. En la vista previa podrás acomodar su posición y tamaño exacto antes de aprobar el documento." }),
      el("div", { class: "firma-actions" }, [
        el("button", {
          type: "button",
          class: "btn-subtle",
          onclick: () => fileInput.click(),
        }, ["Cambiar imagen"]),
        el("button", {
          type: "button",
          class: "btn-subtle is-danger",
          onclick: () => {
            perfil.firmaSello = "";
            render();
          },
        }, ["Quitar rúbrica"]),
      ]),
    ]);
  } else {
    firmaBox = el("div", { class: "firma-container" }, [
      el("p", { class: "muted", text: "Sube una imagen de tu rúbrica o sello médico (PNG/JPG). En la vista previa de la receta u orden de exámenes podrás acomodarla (moverla o escalarla) y luego aprobar el documento para emitirlo." }),
      el("button", {
        type: "button",
        class: "btn-subtle is-primary",
        onclick: () => fileInput.click(),
      }, ["+ Cargar rúbrica de firma o sello"]),
    ]);
  }

  const temaSelector = selectField(
    "Tema visual",
    "p-tema",
    ["Automático (según dispositivo)", "Claro", "Oscuro"],
    perfil.tema === "dark" ? "Oscuro" : perfil.tema === "light" ? "Claro" : "Automático (según dispositivo)",
    (val) => {
      const code = val === "Oscuro" ? "dark" : val === "Claro" ? "light" : "auto";
      perfil.tema = code;
      aplicarTema(code);
    }
  );

  return el("section", { class: "screen stack" }, [
    errorSlot(),
    field("Nombre", "p-nombre", perfil.nombre, "text", "", null, { autocomplete: "name", name: "name" }),
    field("CMP", "p-cmp", perfil.cmp, "text", "12345", null, { autocomplete: "on", name: "cmp" }),
    field("Especialidad", "p-esp", perfil.especialidad, "text", "Medicina general", null, { autocomplete: "organization-title", name: "organization-title" }),
    field("Teléfono", "p-tel", perfil.telefono, "tel", "999000111", null, { autocomplete: "tel", name: "tel", inputmode: "tel" }),
    field("Correo", "p-mail", perfil.email, "email", "ana@ejemplo.pe", null, { autocomplete: "email", name: "email" }),
    el("div", { class: "field-group" }, [
      el("label", { class: "field-label", text: "Rúbrica de la firma y sello médico" }),
      fileInput,
      firmaBox,
    ]),
    temaSelector,
  ]);
}

function viewPaciente() {
  const gente = loadPacientes();
  const alCambiarDni = (input) => {
    const previo = pacientePorDni(gente, draft.pacienteDNI);
    draft.pacienteDNI = onlyDigits(input.value, 8);
    input.value = draft.pacienteDNI;
    const conocido = pacientePorDni(gente, draft.pacienteDNI);
    if (conocido) {
      applyPaciente(conocido);
    } else if (previo && draft.pacienteNombre === previo.nombre && draft.pacienteEdad === previo.edad && draft.pacienteSexo === (previo.sexo || "")) {
      draft.pacienteNombre = "";
      draft.pacienteEdad = "";
      draft.pacienteSexo = "";
      const nombre = document.getElementById("paciente-nombre");
      const edad = document.getElementById("paciente-edad");
      if (nombre) nombre.value = "";
      if (edad) edad.value = "";
      document.querySelectorAll("[data-sexo]").forEach((button) => {
        button.classList.toggle("is-on", button.getAttribute("data-sexo") === "");
      });
      saveDraft();
      pintarResumen("paciente");
    } else {
      saveDraft();
      pintarResumen("paciente");
    }
    paintPacSuggestions();
    if (/^\d{8}$/.test(draft.pacienteDNI)) consultarNombre(draft.pacienteDNI);
  };
  const dni = field("DNI", "paciente-dni", draft.pacienteDNI, "text", "", alCambiarDni, { autocomplete: "on", name: "dni", inputmode: "numeric", maxlength: "8", list: "lista-dni" });
  dni.classList.add("search-anchor");
  dni.append(el("div", { id: "pac-suggest", class: "suggestions" }));
  dni.querySelector("input").addEventListener("change", () => alCambiarDni(dni.querySelector("input")));
  const nombrePaciente = field("Nombre", "paciente-nombre", draft.pacienteNombre, "text", "Nombre y apellido", (input) => {
      draft.pacienteNombre = cleanText(input.value, 120);
      const exactos = gente.filter((paciente) => paciente.nombre.toLowerCase() === draft.pacienteNombre.toLowerCase());
      if (exactos.length === 1) applyPaciente(exactos[0]);
      saveDraft();
      pintarResumen("paciente");
      paintPacSuggestions();
    }, { autocomplete: "name", name: "name", list: "lista-nombres" });
  nombrePaciente.classList.add("search-anchor");
  const atencionesPasadas = leerHistorial().filter((item) => (
    (draft.pacienteDNI && item.dni === draft.pacienteDNI) ||
    (draft.pacienteNombre && item.nombre && item.nombre.toLowerCase() === draft.pacienteNombre.toLowerCase())
  ));
  const previa = atencionesPasadas[0];
  let avisoPrevia = null;
  if (previa) {
    const esReceta = previa.tipo === "receta";
    const desc = [previa.cie10, previa.diagnostico, esReceta ? `${previa.medicamentos?.length || 0} medicamentos` : `${previa.examenes?.length || 0} exámenes`].filter(Boolean).join(" · ");
    avisoPrevia = el("div", { class: "desk-status-card", style: "margin-top: 10px;" }, [
      el("span", { class: "desk-status-badge blue" }, [
        el("span", { class: "desk-status-dot" }),
        document.createTextNode(`Atención previa (${fechaLegible(previa.cuando)})`),
      ]),
      el("p", { class: "desk-status-text", text: desc || "Prescripción anterior disponible." }),
      el("button", {
        type: "button",
        class: "btn-subtle is-primary",
        onclick: async () => {
          if (draft.medicamentos.length || draft.examenes.length) {
            const ok = await ask("Cargar prescripción previa", "Se actualizarán el diagnóstico y los medicamentos con los de la atención anterior.", "Cargar");
            if (!ok) return;
          }
          draft.diagnostico = previa.diagnostico || draft.diagnostico;
          draft.cie10 = previa.cie10 || draft.cie10;
          draft.proximoControl = previa.proximoControl || draft.proximoControl;
          draft.indicacionesGenerales = previa.indicacionesGenerales || draft.indicacionesGenerales;
          if (previa.medicamentos?.length) {
            draft.medicamentos = previa.medicamentos.map((m) => ({ ...m, id: Date.now() + Math.random() }));
          }
          if (previa.examenes?.length) {
            draft.examenes = previa.examenes.map((e) => ({ ...e, id: Date.now() + Math.random() }));
          }
          saveDraft();
          render();
        },
      }, ["Cargar esquema previo"]),
    ]);
  }

  const section = el("section", { class: "screen stack" }, [
    dni,
    nombrePaciente,
    el("div", { class: "two" }, [
      field("Edad", "paciente-edad", draft.pacienteEdad, "text", "", (input) => {
        draft.pacienteEdad = onlyDigits(input.value, 3);
        input.value = draft.pacienteEdad;
        saveDraft();
      }, { autocomplete: "on", name: "edad", inputmode: "numeric", maxlength: "3" }),
      field("Fecha", "paciente-fecha", draft.fechaAtencion, "date", "", (input) => {
        draft.fechaAtencion = input.value;
        saveDraft();
      }, { autocomplete: "on", name: "fecha" }),
    ]),
    field("Hora", "paciente-hora", draft.horaAtencion, "time", "", (input) => {
      draft.horaAtencion = input.value;
      saveDraft();
    }, { autocomplete: "on", name: "hora" }),
    el("div", {}, [
      el("div", { class: "profile-name", text: "Sexo" }),
      el("div", { class: "segment", role: "group", "aria-label": "Sexo" }, [
        sexButton("", "No indica"),
        sexButton("M", "Masculino"),
        sexButton("F", "Femenino"),
      ]),
    ]),
    avisoPrevia,
    el("datalist", { id: "lista-dni" }, gente.filter((paciente) => paciente.dni).map((paciente) => (
      el("option", { value: paciente.dni, label: paciente.nombre })
    ))),
    el("datalist", { id: "lista-nombres" }, gente.map((paciente) => (
      el("option", { value: paciente.nombre, label: paciente.dni || "" })
    ))),
  ].filter(Boolean));
  queueMicrotask(() => {
    paintPacSuggestions();
    if (!enfocarDni) return;
    enfocarDni = false;
    document.getElementById("paciente-dni")?.focus();
  });
  return section;
}

function sexButton(value, label) {
  return el("button", {
    type: "button",
    class: draft.pacienteSexo === value ? "is-on" : "",
    "data-sexo": value,
    onclick: () => {
      draft.pacienteSexo = value;
      saveDraft();
      goto("paciente");
    },
  }, [label]);
}

function loadPacientes() {
  try {
    const raw = JSON.parse(localStorage.getItem(PACIENTES_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => ({
      nombre: cleanText(item?.nombre, 120),
      dni: onlyDigits(item?.dni, 8),
      edad: onlyDigits(item?.edad, 3),
      sexo: ["M", "F"].includes(item?.sexo) ? item.sexo : "",
    })).filter((item) => item.nombre).slice(0, 80);
  } catch {
    return [];
  }
}

function rememberPaciente() {
  if (!draft.pacienteNombre) return;
  const entry = {
    nombre: draft.pacienteNombre,
    dni: draft.pacienteDNI,
    edad: draft.pacienteEdad,
    sexo: draft.pacienteSexo,
  };
  const resto = loadPacientes().filter((paciente) => {
    if (entry.dni && paciente.dni === entry.dni) return false;
    return paciente.nombre.toLowerCase() !== entry.nombre.toLowerCase();
  });
  localStorage.setItem(PACIENTES_KEY, JSON.stringify([entry, ...resto].slice(0, 80)));
}

const consultasDni = new Map();

function consultarNombre(dni) {
  let pendiente = consultasDni.get(dni);
  if (!pendiente) {
    pendiente = fetch(`/api/dni?numero=${encodeURIComponent(dni)}`)
      .then(async (respuesta) => {
        if (!respuesta.ok) return "";
        const data = await respuesta.json();
        return cleanText(data?.nombre, 120);
      })
      .catch(() => "")
      .finally(() => consultasDni.delete(dni));
    consultasDni.set(dni, pendiente);
  }
  pendiente.then((nombre) => {
    if (!nombre || draft.pacienteDNI !== dni) return;
    draft.pacienteNombre = nombre;
    const nodo = document.getElementById("paciente-nombre");
    if (nodo) nodo.value = nombre;
    saveDraft();
    pintarResumen("paciente");
  });
}

function applyPaciente(paciente) {
  draft.pacienteNombre = paciente.nombre;
  draft.pacienteDNI = paciente.dni;
  draft.pacienteEdad = paciente.edad;
  draft.pacienteSexo = paciente.sexo || "";
  const assign = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.value = value;
  };
  assign("paciente-nombre", draft.pacienteNombre);
  assign("paciente-dni", draft.pacienteDNI);
  assign("paciente-edad", draft.pacienteEdad);
  document.querySelectorAll("[data-sexo]").forEach((button) => {
    button.classList.toggle("is-on", button.getAttribute("data-sexo") === draft.pacienteSexo);
  });
  saveDraft();
  pintarResumen("paciente");
}

function pintarResumen(id) {
  if (panel !== id) return;
  const sum = document.querySelector(".fold.is-open .fold-sum");
  if (sum) sum.textContent = resumenPaso(id);
}

function paintPacSuggestions() {
  const box = document.getElementById("pac-suggest");
  if (!box) return;
  anclarLista(box);
  const nombre = document.getElementById("paciente-nombre")?.value || "";
  const dni = document.getElementById("paciente-dni")?.value || "";
  const vistos = new Set();
  const matches = [...buscarPacientes(loadPacientes(), nombre), ...buscarPacientes(loadPacientes(), dni)]
    .filter((paciente) => {
      const clave = `${paciente.dni}|${paciente.nombre}`;
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      const yaEsta = paciente.nombre === draft.pacienteNombre && paciente.dni === draft.pacienteDNI && paciente.edad === draft.pacienteEdad;
      return !yaEsta;
    });
  const visibles = matches.slice(0, 16);
  const resto = matches.length - visibles.length;
  const nodes = visibles.map((paciente) => {
    const button = el("button", { type: "button", class: "suggestion" }, [
      el("strong", { text: paciente.dni || paciente.nombre }),
      el("small", { text: [paciente.dni ? paciente.nombre : "", paciente.edad ? `${paciente.edad} años` : "", paciente.sexo].filter(Boolean).join(" · ") }),
    ]);
    button.addEventListener("click", () => {
      applyPaciente(paciente);
      paintPacSuggestions();
    });
    return button;
  });
  if (resto > 0) nodes.push(el("p", { class: "suggest-more", text: `${resto} pacientes más. Escribe el nombre o el DNI para afinar.` }));
  box.replaceChildren(...nodes);
}

function viewDiagnostico() {
  const section = el("section", { class: "screen stack" });
  const search = el("input", {
    id: "dx-query",
    type: "text",
    value: draft.dxQuery,
    placeholder: "Asma, neumonía, HTA",
    maxlength: "80",
    autocomplete: "off",
  });
  search.addEventListener("input", () => {
    draft.dxQuery = cleanText(search.value, 80);
    saveDraft();
    paintDxSuggestions();
  });
  section.append(el("label", { class: "field search-anchor", text: "Buscar" }, [
    search,
    el("div", { id: "dx-suggest", class: "suggestions" }),
  ]));

  // Fila de Diagnósticos Rápidos (Top CIE-10) con selección a 1 toque
  const chipsTop = TOP_DIAGNOSTICOS.map((top) => {
    const isActive = draft.cie10 === top.codigo;
    return el("button", {
      type: "button",
      class: `dx-quick-chip${isActive ? " is-active" : ""}`,
      onclick: () => {
        draft.cie10 = top.codigo;
        draft.diagnostico = top.descripcion;
        draft.dxQuery = "";
        saveDraft();
        goto("diagnostico");
      },
    }, [
      el("strong", { text: top.codigo }),
      el("span", { text: top.titulo }),
    ]);
  });

  section.append(el("div", { class: "dx-rapidos-section" }, [
    el("span", { class: "dx-rapidos-label", text: "Diagnósticos frecuentes" }),
    el("div", { class: "dx-rapidos-scroll" }, chipsTop),
  ]));

  if (draft.diagnostico) {
    section.append(el("article", { class: "item" }, [
      el("div", { class: "item-top" }, [
        el("div", {}, [
          el("h3", { text: draft.diagnostico }),
          draft.cie10 ? el("p", { class: "muted", text: draft.cie10 }) : null,
        ]),
        el("div", { class: "item-actions" }, [
          iconBtn("pencil", "Cambiar", () => document.getElementById("dx-query")?.focus()),
          iconBtn("trash", "Quitar", () => {
            draft.diagnostico = "";
            draft.cie10 = "";
            saveDraft();
            goto("diagnostico");
          }, "is-danger"),
        ]),
      ]),
    ]));
  }
  queueMicrotask(paintDxSuggestions);
  return section;
}

function vacioLista(texto, onclick) {
  return el("div", { class: "empty" }, [
    el("p", { text: texto }),
    botonMas("Agregar", onclick),
  ]);
}

function viewMedicamentos() {
  const items = draft.medicamentos.map(medCard);
  let bannerAlerta = null;
  for (let i = 0; i < draft.medicamentos.length; i++) {
    const alerta = verificarAlertaSeguridad(draft.medicamentos[i], draft.medicamentos, draft.medicamentos[i].id);
    if (alerta) {
      bannerAlerta = el("div", { class: `clinical-alert ${alerta.tipo}` }, [
        el("div", { class: "alert-icon", text: "⚠️" }),
        el("div", { class: "alert-body" }, [
          el("strong", { text: alerta.titulo }),
          el("p", { text: alerta.mensaje }),
        ]),
      ]);
      break;
    }
  }

  // Barra de herramientas: Tx frecuentes, Calculadora pediátrica y Guardar actual
  const toolbar = el("div", { class: "med-toolbar" }, [
    el("button", {
      type: "button",
      class: "btn-tool is-tx",
      onclick: () => abrirModal("tx-frecuentes"),
    }, [
      icono("bookmark"),
      el("span", { text: "Tx frecuentes" }),
    ]),
    el("button", {
      type: "button",
      class: "btn-tool is-calc",
      onclick: () => abrirModal("calc-pediatrica"),
    }, [
      icono("calc"),
      el("span", { text: "Calc. Pediátrica" }),
    ]),
    items.length ? el("button", {
      type: "button",
      class: "btn-tool is-save",
      onclick: () => abrirGuardarTx(null),
    }, [
      icono("check"),
      el("span", { text: "Guardar como Tx" }),
    ]) : null,
  ].filter(Boolean));

  return el("section", { class: "screen stack" }, [
    bannerAlerta,
    toolbar,
    items.length ? null : vacioLista("Todavía no hay medicamentos.", () => openComposer("med")),
    ...items,
    items.length ? botonMas("Agregar medicamento", () => openComposer("med")) : null,
  ].filter(Boolean));
}

function quitarMedicamentoActual() {
  if (medEditId) {
    draft.medicamentos = draft.medicamentos.filter((item) => item.id !== medEditId);
    saveDraft();
    medEditId = null;
    medForm = emptyMedForm();
    cambiandoMed = false;
    composer = null;
    goto("medicamentos");
    return;
  }
  medForm = emptyMedForm();
  cambiandoMed = false;
  goto("medicamentos");
}

function medicamentoElegido(opciones) {
  let presentacion = null;
  if (opciones.length > 1) {
    const select = el("select", { id: "med-presentacion" }, opciones.map((med) => (
      el("option", { value: med.presentacion, text: `${med.presentacion} · ${med.via}` })
    )));
    select.value = opciones.some((med) => med.presentacion === medForm.presentacion) ? medForm.presentacion : opciones[0].presentacion;
    if (select.value !== medForm.presentacion) {
      const elegido = opciones.find((med) => med.presentacion === select.value);
      if (elegido) elegirPresentacion(elegido);
    }
    select.addEventListener("change", () => {
      const elegido = opciones.find((med) => med.presentacion === select.value);
      if (!elegido) return;
      elegirPresentacion(elegido);
      const dosis = document.getElementById("med-dosis");
      const via = document.getElementById("med-via");
      if (dosis) dosis.value = medForm.dosis;
      if (via) via.value = medForm.via;
      const ficha = document.getElementById("med-ficha");
      if (ficha) ficha.textContent = [medForm.presentacion, medForm.via].filter(Boolean).join(" · ");
    });
    presentacion = el("label", { class: "field", text: "Presentación" }, [select]);
  }
  return el("article", { class: "item elegido" }, [
    el("div", { class: "item-top" }, [
      el("div", {}, [
        el("h3", { text: medForm.nombre }),
        opciones.length > 1 ? null : el("p", { id: "med-ficha", class: "muted", text: [medForm.presentacion, medForm.via].filter(Boolean).join(" · ") }),
      ]),
      el("div", { class: "item-actions" }, [
        iconBtn("pencil", "Cambiar", () => {
          cambiandoMed = true;
          goto("medicamentos");
          queueMicrotask(() => document.getElementById("med-q")?.focus());
        }),
        iconBtn("trash", "Quitar", quitarMedicamentoActual, "is-danger"),
      ]),
    ]),
    presentacion,
  ]);
}

function presentacionesDe(dci) {
  const nombre = String(dci || "").trim().toLowerCase();
  if (!nombre) return [];
  return medicamentosData.filter((med) => med.dci.toLowerCase() === nombre);
}

function viewMedComposer() {
  const opciones = presentacionesDe(medForm.nombre);
  const buscar = el("input", {
    id: "med-q",
    type: "search",
    value: medForm.q,
    placeholder: "Diclofenaco, ampolla",
    maxlength: "80",
    autocomplete: "off",
  });
  buscar.addEventListener("input", () => {
    medForm.q = cleanText(buscar.value, 80);
    paintMedSuggestions();
  });
  const section = el("section", { class: "screen stack" });
  if (!medForm.nombre || cambiandoMed) {
    section.append(el("label", { class: "field search-anchor", text: "Buscar" }, [
      buscar,
      el("div", { id: "med-suggest", class: "suggestions" }),
    ]));
  }
  if (medForm.nombre) {
    section.append(medicamentoElegido(opciones));
    const alerta = verificarAlertaSeguridad(medForm, draft.medicamentos, medEditId);
    if (alerta) {
      section.append(el("div", { class: `clinical-alert ${alerta.tipo}` }, [
        el("div", { class: "alert-icon", text: "⚠️" }),
        el("div", { class: "alert-body" }, [
          el("strong", { text: alerta.titulo }),
          el("p", { text: alerta.mensaje }),
        ]),
      ]));
    }
    section.append(selectField("Frecuencia", "med-frecuencia", FRECUENCIAS, medForm.frecuencia, (value) => {
      medForm.frecuencia = FRECUENCIAS.includes(value) ? value : "";
      syncCantidad();
    }));
    section.append(diasField());
    section.append(cantidadField());
  }
  queueMicrotask(paintMedSuggestions);
  return section;
}

function resumenPacienteOrden() {
  const sexo = draft.pacienteSexo === "M" ? "Masculino" : draft.pacienteSexo === "F" ? "Femenino" : "";
  const detalle = [
    draft.pacienteDNI ? `DNI ${draft.pacienteDNI}` : "",
    draft.pacienteEdad ? `${draft.pacienteEdad} años` : "",
    sexo,
  ].filter(Boolean).join(" · ");
  return el("article", { class: draft.pacienteNombre ? "item order-patient" : "item order-patient is-empty" }, [
    el("span", { class: "patient-mark", "aria-hidden": "true", text: initials(draft.pacienteNombre) }),
    el("div", { class: "patient-copy" }, [
        el("p", { class: "eyebrow", text: "Paciente" }),
        el("h3", { text: draft.pacienteNombre || "Completa los datos del paciente" }),
        detalle ? el("p", { class: "muted", text: detalle }) : null,
    ]),
    iconBtn("pencil", draft.pacienteNombre ? "Editar paciente" : "Completar paciente", () => goto("paciente")),
  ]);
}

function selectorTipoExamen() {
  return el("div", { class: "segment exam-types", role: "group", "aria-label": "Tipo de examen" }, [
    ...["Laboratorio", "Imágenes"].map((tipo) => {
      const cuentaTipo = draft.examenes.filter((ex) => ex.tipo === tipo).length;
      return el("button", {
        type: "button",
        class: examTipo === tipo ? "is-on" : "",
        "aria-pressed": examTipo === tipo ? "true" : "false",
        onclick: () => {
          examTipo = tipo;
          composer = null;
          examQuery = "";
          examNombre = "";
          examEditId = null;
          render();
        },
      }, [
        el("span", { text: tipo }),
        cuentaTipo ? el("span", { class: "tab-count", text: String(cuentaTipo) }) : null,
      ]);
    }),
  ]);
}

function resumenOrdenExamenes() {
  const laboratorios = draft.examenes.filter((ex) => ex.tipo === "Laboratorio").length;
  const imagenes = draft.examenes.filter((ex) => ex.tipo === "Imágenes").length;
  const total = laboratorios + imagenes;
  if (!total) return null;
  return el("div", { class: "order-summary" }, [
    el("strong", { text: `${total} examen${total === 1 ? "" : "es"} en la orden` }),
    el("span", { text: [
      laboratorios ? `${laboratorios} laboratorio${laboratorios === 1 ? "" : "s"}` : "",
      imagenes ? `${imagenes} ${imagenes === 1 ? "estudio" : "estudios"}` : "",
    ].filter(Boolean).join(" · ") }),
  ]);
}

function viewOrdenExamenes() {
  const packs = obtenerPacksExamenes();
  const packChips = packs.slice(0, 4).map((pack) => {
    return el("button", {
      type: "button",
      class: "pack-quick-chip",
      title: pack.descripcion,
      onclick: () => {
        aplicarPackExamenesADraft(draft, pack);
        saveDraft();
        render();
      },
    }, [
      el("span", { text: "+ " + pack.nombre.split("/")[0].trim() }),
    ]);
  });

  const packsBar = el("div", { class: "packs-quick-bar" }, [
    el("div", { class: "packs-quick-header" }, [
      el("span", { class: "packs-quick-title", text: "Packs frecuentes de exámenes" }),
      el("button", {
        type: "button",
        class: "btn-subtle",
        style: "padding: 3px 8px; font-size: 11px; flex: none;",
        onclick: () => abrirModal("packs-examenes"),
      }, ["Ver todos / Guardar"]),
    ]),
    el("div", { class: "pack-chips-row" }, packChips),
  ]);

  return el("section", { class: "screen stack exam-order" }, [
    errorSlot(),
    resumenPacienteOrden(),
    el("div", { class: "order-heading" }, [
      el("h2", { text: examTipo === "Laboratorio" ? "Exámenes de laboratorio" : "Imágenes y otros estudios" }),
      el("p", { text: "Busca, selecciona y revisa la preparación antes de generar la orden." }),
    ]),
    packsBar,
    selectorTipoExamen(),
    resumenOrdenExamenes(),
    composer === "exam" ? viewExamComposer() : viewExamenes(),
  ]);
}

function viewExamenes() {
  const items = draft.examenes.filter((ex) => ex.tipo === examTipo).map(examCard);
  return el("div", { class: "stack exam-list" }, [
    items.length ? null : el("div", { class: "empty exam-empty" }, [
      el("span", { class: "empty-mark", "aria-hidden": "true", text: examTipo === "Laboratorio" ? "LAB" : "IMG" }),
      el("div", {}, [
        el("strong", { text: examTipo === "Laboratorio" ? "Sin análisis seleccionados" : "Sin estudios seleccionados" }),
        el("p", { text: examTipo === "Laboratorio"
          ? "Agrega hemograma, perfiles, cultivos u otras pruebas."
          : "Agrega radiografías, ecografías, tomografías u otros estudios." }),
      ]),
      botonMas("Agregar examen", () => openComposer("exam")),
    ]),
    ...items,
    items.length ? botonMas("Agregar examen", () => openComposer("exam")) : null,
  ]);
}

function viewExamComposer() {
  const section = el("div", { class: "stack exam-composer" });
  const search = el("input", {
    id: "exam-q",
    type: "search",
    value: examQuery,
    placeholder: examTipo === "Laboratorio" ? "Hemograma, glucosa, perfil lipídico" : "Radiografía, ecografía, TAC",
    maxlength: "80",
    autocomplete: "off",
  });
  search.addEventListener("input", () => {
    examQuery = cleanText(search.value, 80);
    paintExamSuggestions();
  });
  section.append(el("label", { class: "field search-anchor", text: "Buscar" }, [
    search,
    el("div", { id: "exam-suggest", class: "suggestions" }),
  ]));
  if (examNombre) {
    const catalogo = catalogExam(examNombre);
    section.append(el("article", { class: "item elegido" }, [
      el("div", { class: "item-top" }, [
        el("span", { class: "exam-kind", "aria-hidden": "true", text: examTipo === "Laboratorio" ? "LAB" : "IMG" }),
        el("div", {}, [
          el("h3", { text: examNombre }),
          catalogo?.grupo ? el("p", { class: "muted", text: catalogo.grupo }) : null,
        ]),
        el("div", { class: "item-actions" }, [
          iconBtn("pencil", "Cambiar", () => {
            examNombre = "";
            render();
            queueMicrotask(() => document.getElementById("exam-q")?.focus());
          }),
          iconBtn("trash", "Quitar", () => {
            if (examEditId) {
              draft.examenes = draft.examenes.filter((item) => item.id !== examEditId);
              saveDraft();
              examEditId = null;
              examNombre = "";
              examQuery = "";
              composer = null;
              goto("examenes");
              return;
            }
            examNombre = "";
            examQuery = "";
            goto("examenes");
          }, "is-danger"),
        ]),
      ]),
      catalogo?.indicacionesSug ? el("div", { class: "exam-guidance" }, [
        el("strong", { text: "Preparación" }),
        el("p", { text: catalogo.indicacionesSug }),
      ]) : null,
    ]));
  }
  queueMicrotask(paintExamSuggestions);
  return section;
}

let recomendacionQuery = "";

function agregarRecomendacion(area, frase) {
  const actual = draft.indicacionesGenerales.trim();
  if (actual.includes(frase)) return;
  const unido = actual ? `${actual}\n${frase}` : frase;
  draft.indicacionesGenerales = cleanMultiline(unido, 800);
  area.value = draft.indicacionesGenerales;
  saveDraft();
}

function viewIndicaciones() {
  const area = el("textarea", {
    id: "indicaciones",
    maxlength: "800",
    placeholder: "Reposo, hidratación, signos de alarma",
  });
  area.value = draft.indicacionesGenerales;
  area.addEventListener("input", () => {
    draft.indicacionesGenerales = cleanMultiline(area.value, 800);
    saveDraft();
  });
  const buscar = el("input", {
    id: "rec-q",
    type: "search",
    value: recomendacionQuery,
    placeholder: "Con alimentos, ayunas, sueño",
    maxlength: "80",
    autocomplete: "off",
  });
  buscar.addEventListener("input", () => {
    recomendacionQuery = cleanText(buscar.value, 80);
    pintarRecomendaciones(area);
  });
  const lista = el("div", { id: "rec-list", class: "chips recs" });
  queueMicrotask(() => pintarRecomendaciones(area));

  // Cálculo automático de fecha de término del tratamiento según la duración máxima de fármacos
  let cardFin = null;
  const duracionMax = duracionMaximaTratamiento(draft.medicamentos);
  if (duracionMax && draft.fechaAtencion) {
    const fechaFin = fechaFinTratamiento(draft.fechaAtencion, duracionMax);
    if (fechaFin) {
      cardFin = el("div", { class: "tx-fin-card" }, [
        el("div", { class: "tx-fin-info" }, [
          el("span", { class: "tx-fin-label", text: "Término del tratamiento prescrito" }),
          el("strong", { class: "tx-fin-date", text: `Hasta el ${fechaFin}` }),
        ]),
        el("span", { class: "tx-fin-badge", text: `(${duracionMax})` }),
      ]);
    }
  }

  return el("section", { class: "screen stack" }, [
    cardFin,
    el("button", { type: "button", class: "add-btn", onclick: () => completarIndicaciones(area) }, ["Completar"]),
    field("Control", "proximo-control", draft.proximoControl, "date", "", (input) => {
      draft.proximoControl = /^\d{4}-\d{2}-\d{2}$/.test(input.value) ? input.value : "";
      saveDraft();
    }),
    el("label", { class: "field", text: "Recomendaciones" }, [buscar]),
    lista,
    el("label", { class: "field", text: "Indicaciones" }, [area]),
  ].filter(Boolean));
}

function pintarRecomendaciones(area) {
  const lista = document.getElementById("rec-list");
  if (!lista) return;
  const frases = frasesRecomendadas(draft.medicamentos, recomendacionQuery);
  lista.replaceChildren(...frases.map((frase) => {
    const puesta = draft.indicacionesGenerales.includes(frase);
    const button = el("button", {
      type: "button",
      class: puesta ? "is-on" : "",
      onclick: () => {
        agregarRecomendacion(area, frase);
        pintarRecomendaciones(area);
      },
    }, [frase]);
    return button;
  }));
}

function viewRevision() {
  const sexo = draft.pacienteSexo === "M" ? "Masculino" : draft.pacienteSexo === "F" ? "Femenino" : "";
  const edad = draft.pacienteEdad ? `${draft.pacienteEdad} años` : "";
  const cuando = [fechaLegible(draft.fechaAtencion), draft.horaAtencion].filter(Boolean).join(" · ");
  return el("section", { class: "screen stack" }, [
    errorSlot(),
    reviewBlock("Médico", "perfil", [
      perfil.nombre,
      perfil.cmp ? `CMP ${perfil.cmp}` : "",
    ]),
    reviewBlock("Paciente", "paciente", draft.pacienteNombre || draft.pacienteDNI ? [
      draft.pacienteNombre,
      draft.pacienteDNI ? `HC: ${draft.pacienteDNI}` : "",
      [edad, sexo].filter(Boolean).join(" · "),
      cuando,
    ] : []),
    reviewBlock("Diagnóstico", "diagnostico", [
      [draft.cie10, draft.diagnostico].filter(Boolean).join(" — "),
      draft.proximoControl ? `Control ${fechaLegible(draft.proximoControl)}` : "",
    ]),
    reviewBlock("Medicamentos", "medicamentos", draft.medicamentos.map((med) => `${med.nombre} — ${med.cantidad}, ${med.frecuencia}`)),
    reviewBlock("Indicaciones", "indicaciones", [draft.indicacionesGenerales]),
  ]);
}

function abrirPrevia(origen) {
  origenPrevia = origen || "receta";
  screen = "previa";
  render();
}

function previewSignatureBox() {
  const ajuste = sanitizeRubricaAjuste(perfil.rubricaAjuste);
  if (!perfil.firmaSello) {
    return el("div", { class: "preview-signature-box" }, [
      el("div", { class: "preview-signature-line" }),
      el("div", { class: "preview-signature-text", text: "Firma y Sello" }),
      el("button", {
        type: "button",
        class: "btn-subtle",
        style: "margin-top: 6px; font-size: 11px; padding: 4px 8px;",
        onclick: () => openPerfil("previa"),
      }, ["+ Agregar rúbrica"]),
    ]);
  }

  const mover = (dx, dy) => {
    perfil.rubricaAjuste = sanitizeRubricaAjuste({
      offsetX: ajuste.offsetX + dx,
      offsetY: ajuste.offsetY + dy,
      escala: ajuste.escala,
    });
    savePerfil();
    render();
  };

  const escalar = (factor) => {
    perfil.rubricaAjuste = sanitizeRubricaAjuste({
      offsetX: ajuste.offsetX,
      offsetY: ajuste.offsetY,
      escala: ajuste.escala + factor,
    });
    savePerfil();
    render();
  };

  const resetear = () => {
    perfil.rubricaAjuste = { offsetX: 0, offsetY: 0, escala: 1 };
    savePerfil();
    render();
  };

  return el("div", { class: "preview-signature-box rubrica-interactive" }, [
    el("div", { class: "preview-rubrica-stage" }, [
      el("img", {
        src: perfil.firmaSello,
        class: "preview-firma-img",
        alt: "Rúbrica y Sello",
        style: `transform: translate(${ajuste.offsetX}px, ${ajuste.offsetY}px) scale(${ajuste.escala}); transform-origin: center center;`,
      }),
    ]),
    el("div", { class: "preview-signature-line" }),
    el("div", { class: "preview-signature-text", text: "Firma y Sello" }),
    el("div", { class: "rubrica-controls-panel" }, [
      el("div", { class: "rubrica-controls-label" }, [
        el("span", { text: "Acomodar rúbrica:" }),
        (ajuste.offsetX !== 0 || ajuste.offsetY !== 0 || ajuste.escala !== 1) ? el("button", {
          type: "button",
          class: "rubrica-reset-btn",
          onclick: resetear,
          title: "Restablecer posición y tamaño",
        }, ["Reset"]) : null,
      ]),
      el("div", { class: "rubrica-dpad" }, [
        el("button", { type: "button", class: "dpad-btn up", title: "Mover arriba", onclick: () => mover(0, -3) }, ["▲"]),
        el("div", { class: "dpad-row" }, [
          el("button", { type: "button", class: "dpad-btn left", title: "Mover a la izquierda", onclick: () => mover(-4, 0) }, ["◀"]),
          el("button", { type: "button", class: "dpad-btn center", title: "Centrar", onclick: () => { perfil.rubricaAjuste.offsetX = 0; perfil.rubricaAjuste.offsetY = 0; savePerfil(); render(); } }, ["•"]),
          el("button", { type: "button", class: "dpad-btn right", title: "Mover a la derecha", onclick: () => mover(4, 0) }, ["▶"]),
        ]),
        el("button", { type: "button", class: "dpad-btn down", title: "Mover abajo", onclick: () => mover(0, 3) }, ["▼"]),
      ]),
      el("div", { class: "rubrica-zoom-row" }, [
        el("button", { type: "button", class: "btn-subtle rubrica-zoom-btn", title: "Reducir tamaño", onclick: () => escalar(-0.1) }, ["A-"]),
        el("span", { class: "rubrica-zoom-val", text: `${Math.round(ajuste.escala * 100)}%` }),
        el("button", { type: "button", class: "btn-subtle rubrica-zoom-btn", title: "Aumentar tamaño", onclick: () => escalar(0.1) }, ["A+"]),
      ]),
    ]),
  ]);
}

function viewPrevia() {
  const esReceta = origenPrevia === "receta";
  if (esReceta) {
    const rpList = draft.medicamentos.map((med, idx) => el("div", { class: "preview-rp-item" }, [
      el("div", { class: "preview-rp-title" }, [
        el("strong", { text: `${idx + 1}. ${med.nombre}` }),
        el("span", { class: "preview-rp-cant", text: med.cantidad }),
      ]),
      el("div", { class: "preview-rp-pauta", text: [med.presentacion, med.dosis, med.frecuencia, med.duracion, med.via].filter(Boolean).join(" · ") }),
      med.indicaciones ? el("div", { class: "preview-rp-extra", text: med.indicaciones }) : null,
    ]));

    const indicaciones = [
      ...String(draft.indicacionesGenerales || indicacionesAutomaticas(draft)).split("\n").map((l) => l.trim()).filter(Boolean),
    ];

    return el("section", { class: "screen preview-screen stack" }, [
      el("div", { class: "preview-paper stack" }, [
        el("div", { class: "preview-header" }, [
          crearLogo(claveEspecialidad(perfil.especialidad)),
          el("div", { style: "text-align: center; flex: 1;" }, [
            el("div", { class: "preview-doctor-name", text: perfil.nombre ? `DR. ${(perfil.nombre).toUpperCase()}` : "DR. MÉDICO TRATANTE" }),
            el("div", { class: "preview-doctor-sub", text: [perfil.especialidad, perfil.cmp ? `CMP ${perfil.cmp}` : ""].filter(Boolean).join("  |  ").toUpperCase() }),
          ]),
          el("div", { class: "preview-header-tag", text: "RECETA" }),
        ]),
        el("div", { class: "preview-patient-bar" }, [
          el("div", { class: "preview-patient-name", text: draft.pacienteNombre || "Paciente no especificado" }),
          el("div", { class: "preview-patient-sub", text: [
            draft.pacienteDNI ? `DNI: ${draft.pacienteDNI}` : "",
            draft.pacienteEdad ? `Edad: ${draft.pacienteEdad} años` : "",
            draft.pacienteSexo ? `Sexo: ${draft.pacienteSexo}` : "",
            `Fecha: ${fechaGuion(draft.fechaAtencion)}`,
          ].filter(Boolean).join("   ·   ") }),
          (draft.diagnostico || draft.cie10) ? el("div", { class: "preview-patient-dx", text: `Dx: ${[draft.cie10, draft.diagnostico].filter(Boolean).join(" — ")}` }) : null,
        ]),
        el("div", { class: "preview-body-grid" }, [
          el("div", { class: "preview-col" }, [
            el("div", { class: "preview-col-head", text: "Rp/ Medicamentos" }),
            el("div", { class: "preview-rp-list" }, rpList.length ? rpList : [el("p", { class: "muted", text: "Sin medicamentos agregados" })]),
          ]),
          el("div", { class: "preview-col" }, [
            el("div", { class: "preview-col-head", text: "Indicaciones y Cuidados" }),
            el("ul", { class: "preview-notes" }, indicaciones.length ? indicaciones.map((ind) => el("li", { text: ind })) : [el("li", { text: "Seguir indicaciones médicas." })]),
          ]),
        ]),
        el("div", { class: "preview-footer-grid" }, [
          el("div", { class: "preview-control" }, [
            el("strong", { text: "Próximo control: " }),
            el("span", { text: draft.proximoControl ? fechaLegible(draft.proximoControl) : "Según evolución clínica" }),
          ]),
          previewSignatureBox(),
        ]),
      ]),
    ]);
  } else {
    const labs = draft.examenes.filter((e) => e.tipo === "Laboratorio");
    const imgs = draft.examenes.filter((e) => e.tipo !== "Laboratorio");

    return el("section", { class: "screen preview-screen stack" }, [
      el("div", { class: "preview-paper stack" }, [
        el("div", { class: "preview-header" }, [
          crearLogo(claveEspecialidad(perfil.especialidad)),
          el("div", { style: "text-align: center; flex: 1;" }, [
            el("div", { class: "preview-doctor-name", text: perfil.nombre ? `DR. ${(perfil.nombre).toUpperCase()}` : "DR. MÉDICO TRATANTE" }),
            el("div", { class: "preview-doctor-sub", text: [perfil.especialidad, perfil.cmp ? `CMP ${perfil.cmp}` : ""].filter(Boolean).join("  |  ").toUpperCase() }),
          ]),
          el("div", { class: "preview-header-tag", text: "ORDEN" }),
        ]),
        el("div", { class: "preview-patient-bar" }, [
          el("div", { class: "preview-patient-name", text: draft.pacienteNombre || "Paciente no especificado" }),
          el("div", { class: "preview-patient-sub", text: [
            draft.pacienteDNI ? `DNI: ${draft.pacienteDNI}` : "",
            draft.pacienteEdad ? `Edad: ${draft.pacienteEdad} años` : "",
            draft.pacienteSexo ? `Sexo: ${draft.pacienteSexo}` : "",
            `Fecha: ${fechaLegible(draft.fechaAtencion)}`,
          ].filter(Boolean).join("   ·   ") }),
          (draft.diagnostico || draft.cie10) ? el("div", { class: "preview-patient-dx", text: `Dx: ${[draft.cie10, draft.diagnostico].filter(Boolean).join(" — ")}` }) : null,
        ]),
        labs.length ? el("div", { class: "preview-section stack" }, [
          el("div", { class: "preview-col-head", text: "LABORATORIO CLÍNICO" }),
          el("ul", { class: "preview-list" }, labs.map((ex) => el("li", {}, [
            el("strong", { text: ex.nombre }),
            ex.indicaciones ? el("span", { class: "muted", text: ` (${ex.indicaciones})` }) : null,
          ]))),
        ]) : null,
        imgs.length ? el("div", { class: "preview-section stack" }, [
          el("div", { class: "preview-col-head", text: "IMÁGENES Y OTROS ESTUDIOS" }),
          el("ul", { class: "preview-list" }, imgs.map((ex) => el("li", {}, [
            el("strong", { text: ex.nombre }),
            ex.indicaciones ? el("span", { class: "muted", text: ` (${ex.indicaciones})` }) : null,
          ]))),
        ]) : null,
        el("div", { class: "preview-footer-grid" }, [
          el("div", { class: "preview-control" }, [
            el("span", { class: "muted", text: "Validez: 30 días calendario" }),
          ]),
          previewSignatureBox(),
        ]),
      ]),
    ]);
  }
}

function rePrescribirHistorial(item) {
  draft = emptyDraft();
  draft.pacienteNombre = item.nombre || "";
  draft.pacienteDNI = item.dni || "";
  draft.pacienteEdad = item.edad || "";
  draft.pacienteSexo = item.sexo || "";
  draft.diagnostico = item.diagnostico || "";
  draft.cie10 = item.cie10 || "";
  draft.fechaAtencion = todayISO();
  draft.horaAtencion = nowTime();
  if (item.tipo === "orden") {
    draft.examenes = (item.examenes || []).map((e) => ({ ...e }));
    origenExamenes = "inicio";
    screen = "examenes";
  } else {
    draft.medicamentos = (item.medicamentos || []).map((m) => ({ ...m }));
    draft.indicacionesGenerales = item.indicacionesGenerales || "";
    draft.proximoControl = item.proximoControl || "";
    screen = "receta";
    panel = "medicamentos";
  }
  rememberPaciente();
  saveDraft();
  render();
}

function atenderPacienteHistorial(item) {
  draft = emptyDraft();
  draft.pacienteNombre = item.nombre || "";
  draft.pacienteDNI = item.dni || "";
  draft.pacienteEdad = item.edad || "";
  draft.pacienteSexo = item.sexo || "";
  draft.diagnostico = item.diagnostico || "";
  draft.cie10 = item.cie10 || "";
  draft.fechaAtencion = todayISO();
  draft.horaAtencion = nowTime();
  screen = "receta";
  panel = "paciente";
  rememberPaciente();
  saveDraft();
  render();
}

function confirmarBorrarHistorial() {
  dialog = {
    titulo: "¿Borrar historial?",
    mensaje: "Se eliminarán las atenciones guardadas localmente en este navegador. Esta acción no se puede deshacer.",
    confirmar: "Borrar todo",
    onConfirm: () => {
      borrarHistorial();
      dialog = null;
      render();
    },
    onCancel: () => {
      dialog = null;
      render();
    },
  };
  render();
}

function viewHistorial() {
  const lista = leerHistorial();
  return el("section", { class: "screen stack" }, [
    el("div", { class: "historial-header" }, [
      el("h2", { style: "margin: 0; font-size: 17px; color: var(--ink);", text: `Atenciones recientes (${lista.length})` }),
      lista.length ? el("button", {
        type: "button",
        class: "btn-subtle is-danger",
        style: "flex: none; padding: 4px 10px; font-size: 12px;",
        onclick: confirmarBorrarHistorial,
      }, ["Limpiar"]) : null,
    ]),
    lista.length ? el("div", { class: "stack", style: "gap: 12px;" }, lista.map((item) => {
      const esReceta = item.tipo !== "orden";
      const itemsTexto = esReceta
        ? (item.medicamentos || []).map((m) => `${m.nombre} — ${m.cantidad} (${m.frecuencia || "dosis única"})`).join(", ")
        : (item.examenes || []).map((e) => `${e.nombre} [${e.tipo || "Estudio"}]`).join(", ");

      return el("article", { class: "historial-card" }, [
        el("div", { class: "historial-top" }, [
          el("span", {
            class: `historial-badge ${esReceta ? "blue" : "purple"}`,
            text: esReceta ? "Receta" : "Orden",
          }),
          el("span", { class: "historial-date", text: [item.cuando ? fechaLegible(item.cuando) : "", item.hora].filter(Boolean).join(" · ") }),
        ]),
        el("h3", { class: "historial-paciente", text: item.nombre || "Paciente sin nombre" }),
        el("div", { class: "historial-dx", text: [
          item.dni ? `DNI: ${item.dni}` : "",
          item.edad ? `${item.edad} años` : "",
          item.diagnostico ? `Dx: ${item.cie10 ? item.cie10 + " — " : ""}${item.diagnostico}` : "",
        ].filter(Boolean).join("   ·   ") }),
        itemsTexto ? el("p", { class: "historial-items", text: itemsTexto }) : null,
        el("div", { class: "historial-actions" }, [
          el("button", {
            type: "button",
            class: "btn-subtle",
            onclick: () => atenderPacienteHistorial(item),
          }, ["Nueva atención"]),
          el("button", {
            type: "button",
            class: "btn-subtle is-primary",
            onclick: () => rePrescribirHistorial(item),
          }, [esReceta ? "Repetir receta" : "Repetir orden"]),
          esReceta && (item.medicamentos || []).length ? el("button", {
            type: "button",
            class: "btn-subtle is-tx-save",
            title: "Guardar este esquema como protocolo reutilizable para futuros pacientes",
            onclick: () => abrirGuardarTx(item),
          }, ["Guardar Tx"]) : null,
        ].filter(Boolean)),
      ]);
    })) : el("div", { class: "empty-state" }, [
      el("div", { class: "empty-icon" }, [icono("clock")]),
      el("h3", { style: "margin: 0; color: var(--ink);", text: "Sin atenciones registradas" }),
      el("p", { class: "muted", style: "margin: 0; max-width: 280px; font-size: 13px;", text: "Las recetas y órdenes que emitas se guardarán aquí para re-prescribir con un solo toque." }),
      el("button", {
        type: "button",
        class: "btn",
        style: "margin-top: 10px;",
        onclick: () => goto("inicio"),
      }, ["Volver al inicio"]),
    ]),
  ]);
}

function textoWhatsAppReceta(emitido) {
  const lineas = [
    "*RECETA MÉDICA*",
    `*Médico:* ${perfil.nombre || ""}${perfil.cmp ? ` (CMP ${perfil.cmp})` : ""}`,
    `*Paciente:* ${emitido.pacienteNombre}`,
    emitido.pacienteDNI ? `*DNI:* ${emitido.pacienteDNI}` : "",
    emitido.diagnostico ? `*Diagnóstico:* ${emitido.diagnostico}` : "",
    `*Fecha de emisión:* ${fechaLegible(emitido.fechaAtencion)}`,
  ];

  const durMax = duracionMaximaTratamiento(emitido.medicamentos);
  if (durMax && emitido.fechaAtencion) {
    const fin = fechaFinTratamiento(emitido.fechaAtencion, durMax);
    if (fin) {
      lineas.push(`*Término del tratamiento:* ${fin} (${durMax})`);
    }
  }

  lineas.push("");
  lineas.push("*Rp/ Prescripción:*");
  (emitido.medicamentos || []).forEach((m, idx) => {
    lineas.push(`${idx + 1}. *${m.nombre}* (${m.presentacion || ""})`);
    const pauta = [`Cant: ${m.cantidad}`, m.dosis, m.frecuencia, m.duracion, m.via].filter(Boolean).join(" - ");
    if (pauta) lineas.push(`   ${pauta}`);
    if (m.indicaciones) lineas.push(`   _Indicación: ${m.indicaciones}_`);
  });
  if (emitido.indicacionesGenerales) {
    lineas.push("");
    lineas.push("*Indicaciones generales:*");
    lineas.push(emitido.indicacionesGenerales);
  }
  if (emitido.proximoControl) {
    lineas.push("");
    lineas.push(`*Próximo control:* ${fechaLegible(emitido.proximoControl)}`);
  }
  return lineas.filter((l) => l !== "").join("\n");
}

function compartirWhatsApp() {
  if (!ultimoEmitido) return;
  const texto = textoWhatsAppReceta(ultimoEmitido);
  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
  window.open(url, "_blank");
}

async function compartirReceta() {
  if (!ultimoEmitido) return;
  const texto = textoWhatsAppReceta(ultimoEmitido);
  const titulo = `Receta médica - ${ultimoEmitido.pacienteNombre}`;
  if (navigator.share) {
    try {
      await navigator.share({
        title: titulo,
        text: texto,
      });
    } catch {}
  } else if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(texto);
      showError("¡Copiado al portapapeles para compartir!");
      render();
    } catch {}
  }
}

function viewListo() {
  const emitido = ultimoEmitido;
  const items = emitido?.medicamentos?.length
    ? emitido.medicamentos.map((med) => `${med.nombre} — ${med.cantidad}, ${med.frecuencia}`)
    : [];

  return el("section", { class: "screen stack home" }, [
    el("div", { class: "success-mark", text: "✓" }),
    el("h2", { style: "margin: 0; text-align: center; color: var(--ink); font-size: 20px;", text: "¡Receta emitida con éxito!" }),
    el("p", { class: "muted", style: "text-align: center; margin: -4px 0 12px; font-size: 13.5px;", text: "El PDF se generó y guardó en tu dispositivo." }),

    emitido ? el("div", { class: "listo-card" }, [
      el("div", { class: "listo-patient", text: emitido.pacienteNombre }),
      emitido.diagnostico ? el("div", { class: "listo-dx", text: `Diagnóstico: ${emitido.diagnostico}` }) : null,
      items.length ? el("ul", { class: "listo-items" }, items.map((it) => el("li", { text: it }))) : null,
    ]) : null,

    el("div", { class: "listo-actions" }, [
      el("button", {
        type: "button",
        class: "btn-whatsapp",
        onclick: compartirWhatsApp,
      }, [
        icono("whatsapp"),
        el("span", { text: "Enviar receta por WhatsApp" }),
      ]),
      el("button", {
        type: "button",
        class: "btn-share",
        onclick: compartirReceta,
      }, [
        icono("share"),
        el("span", { text: "Compartir con otras apps" }),
      ]),
      emitido && (emitido.medicamentos || []).length ? el("button", {
        type: "button",
        class: "btn-subtle is-tx-save",
        style: "padding: 12px; font-weight: 700; border-radius: 14px; font-size: 13.5px; display: flex; align-items: center; justify-content: center; gap: 8px;",
        onclick: () => abrirGuardarTx(emitido),
      }, [
        icono("bookmark"),
        el("span", { text: "Guardar esquema de este paciente como Tx frecuente" }),
      ]) : null,
    ].filter(Boolean)),

    el("div", { style: "display: flex; gap: 10px; width: 100%; margin-top: 8px;" }, [
      el("button", {
        type: "button",
        class: "btn ghost",
        style: "flex: 1;",
        onclick: () => goto("inicio"),
      }, ["Inicio"]),
      el("button", {
        type: "button",
        class: "btn",
        style: "flex: 1;",
        onclick: startNew,
      }, ["Nueva receta"]),
    ]),
  ]);
}

function field(label, id, value, type, placeholder, onInput, extra = {}) {
  const input = el("input", {
    id,
    type,
    name: extra.name || id,
    value: value ?? "",
    placeholder,
    autocomplete: extra.autocomplete || "on",
    inputmode: extra.inputmode,
    maxlength: extra.maxlength || (type === "email" ? "120" : "120"),
    list: extra.list,
  });
  if (onInput) input.addEventListener("input", () => onInput(input));
  return el("label", { class: "field", text: label }, [input]);
}

function selectField(label, id, options, value, onChange) {
  const select = el("select", { id }, [
    el("option", { value: "", text: "Seleccionar" }),
    ...options.map((option) => el("option", { value: option, text: option, selected: option === value })),
  ]);
  if (value) select.value = value;
  select.addEventListener("change", () => onChange(select.value));
  return el("label", { class: "field", text: label }, [select]);
}

function chipRow(labels, current, onPick) {
  return el("div", { class: "chips" }, labels.map((label) => el("button", {
    type: "button",
    class: label === current ? "is-on" : "",
    onclick: () => onPick(label),
  }, [label])));
}

function medCard(med) {
  return el("article", { class: "item" }, [
    el("div", { class: "item-top" }, [
      el("h3", { text: med.nombre }),
      el("div", { class: "item-actions" }, [
        iconBtn("pencil", "Editar", () => editarMed(med)),
        iconBtn("trash", "Quitar", () => {
          draft.medicamentos = draft.medicamentos.filter((item) => item.id !== med.id);
          saveDraft();
          goto("medicamentos");
        }, "is-danger"),
      ]),
    ]),
    el("p", { text: `${med.presentacion} · ${med.cantidad}` }),
    el("p", { class: "muted", text: `${med.dosis}, ${med.frecuencia}, ${med.duracion}, ${med.via}` }),
    med.indicaciones ? el("p", { class: "muted", text: med.indicaciones }) : null,
  ]);
}

function examCard(ex) {
  return el("article", { class: "item" }, [
    el("div", { class: "item-top" }, [
      el("span", { class: "exam-kind", "aria-hidden": "true", text: ex.tipo === "Laboratorio" ? "LAB" : "IMG" }),
      el("div", {}, [
        el("h3", { text: ex.nombre }),
        el("p", { class: "muted", text: ex.grupo || ex.tipo }),
      ]),
      el("div", { class: "item-actions" }, [
        iconBtn("pencil", "Editar", () => editarExamen(ex)),
        iconBtn("trash", "Quitar", () => {
          draft.examenes = draft.examenes.filter((item) => item.id !== ex.id);
          saveDraft();
          goto("examenes");
        }, "is-danger"),
      ]),
    ]),
    ex.indicaciones ? el("div", { class: "exam-guidance" }, [
      el("strong", { text: "Preparación" }),
      el("p", { text: ex.indicaciones }),
    ]) : null,
  ]);
}

function reviewBlock(title, stepId, lines) {
  const visibles = lines.map((line) => String(line || "").trim()).filter(Boolean);
  return el("section", { class: visibles.length ? "review" : "review is-empty" }, [
    el("div", { class: "review-top" }, [
      el("h2", { text: title }),
      iconBtn("pencil", visibles.length ? "Editar" : "Completar", () => {
        if (stepId === "perfil") openPerfil("revision");
        else goto(stepId);
      }),
    ]),
    ...(visibles.length ? visibles.map((line) => el("p", { text: line })) : [el("p", { class: "muted", text: "Sin datos" })]),
  ]);
}

function anclarLista(box) {
  const campo = document.activeElement?.closest?.(".search-anchor");
  if (!box || !campo || box.parentElement === campo) return;
  campo.append(box);
}

function paintDxSuggestions() {
  const box = document.getElementById("dx-suggest");
  if (!box) return;
  anclarLista(box);
  const term = (draft.dxQuery || "").trim().toLowerCase();
  if (term.length < 2) {
    box.replaceChildren();
    return;
  }
  const ranked = ordenarDiagnosticos(cie10Data.flatMap((dx) => {
    const score = puntajeDiagnostico(dx, term);
    return score < 0 ? [] : [{ dx, score }];
  }));
  const matches = ranked.slice(0, 24);
  const resto = ranked.length - matches.length;
  const nodes = matches.map((item) => {
    const dx = item.dx;
    const curso = etiquetaTipo(dx.tipo);
    const sistemas = new Set(matches.map((item) => item.dx.sistema));
    const nota = [dx.severidad, sistemas.size > 1 ? dx.sistema : ""].filter(Boolean).join(" · ");
    const button = el("button", { type: "button", class: "suggestion" }, [
      el("span", { class: "sug-code", text: dx.codigo }),
      el("strong", { text: dx.descripcion }),
      nota ? el("small", { text: nota }) : null,
    ]);
    button.addEventListener("click", () => {
      const extra = curso && !dx.descripcion.toLowerCase().includes(curso.toLowerCase()) ? ` (${curso})` : "";
      draft.cie10 = cleanText(dx.codigo, 12).toUpperCase();
      draft.diagnostico = cleanText(`${dx.descripcion}${extra}`, 180);
      draft.dxQuery = "";
      saveDraft();
      goto("diagnostico");
    });
    return button;
  });
  if (resto > 0) nodes.push(el("p", { class: "suggest-more", text: `${resto} coincidencias más. Escribe el tipo para afinar.` }));
  box.replaceChildren(...nodes);
}

const FORMAS_MED = {
  inyectable: ["inyectable", "ampolla", "intramuscular", "intravenosa", "intravenoso", "subcutanea"],
  inyectables: ["inyectable", "ampolla", "intramuscular", "intravenosa", "intravenoso", "subcutanea"],
  inyeccion: ["inyectable", "ampolla", "intramuscular", "intravenosa", "intravenoso"],
  ampolla: ["ampolla", "inyectable", "intramuscular", "intravenosa", "intravenoso"],
  ampollas: ["ampolla", "inyectable", "intramuscular", "intravenosa", "intravenoso"],
  intramuscular: ["intramuscular", "ampolla"],
  intravenosa: ["intravenosa", "intravenoso"],
  intravenoso: ["intravenosa", "intravenoso"],
  subcutanea: ["subcutanea", "subcutaneo"],
  im: ["intramuscular"],
  iv: ["intravenosa", "intravenoso"],
  jarabe: ["jarabe", "suspension"],
  suspension: ["suspension", "jarabe"],
  gotas: ["gotas", "colirio"],
  colirio: ["colirio", "oftalmica"],
  gel: ["gel"],
  crema: ["crema"],
  pomada: ["pomada"],
  inhalador: ["inhalador", "inhalatoria"],
  nebulizacion: ["nebulizacion", "inhalatoria"],
  supositorio: ["supositorio", "rectal"],
  supositorios: ["supositorio", "rectal"],
  ovulo: ["ovulo", "vaginal"],
  ovulos: ["ovulo", "vaginal"],
  tableta: ["tableta", "comprimido"],
  tabletas: ["tableta", "comprimido"],
  capsula: ["capsula"],
  capsulas: ["capsula"],
  topico: ["topica", "topico", "gel", "crema", "pomada"],
  topica: ["topica", "topico", "gel", "crema", "pomada"],
};

function coincideMedicamento(texto, token) {
  const claves = FORMAS_MED[token] || [token];
  return claves.some((clave) => {
    if (clave.length <= 3) return new RegExp(`(?:^|[^a-z0-9])${clave}(?:[^a-z0-9]|$)`).test(texto);
    return texto.includes(clave);
  });
}

function scoreMed(med, term) {
  const tokens = sinAcento(term).split(/[^a-z0-9]+/).filter((word) => word.length >= 2);
  if (!tokens.length) return -1;
  const dci = sinAcento(med.dci);
  const ficha = sinAcento(`${med.presentacion || ""} ${med.via || ""} ${med.grupo || ""}`);
  const marcas = sinAcento((med.marcas || []).join(" "));
  const todo = `${dci} ${ficha} ${marcas}`;
  let score = 0;
  for (const token of tokens) {
    const esForma = Boolean(FORMAS_MED[token]);
    if (esForma) {
      if (!coincideMedicamento(ficha, token)) return -1;
      score += 6;
      continue;
    }
    if (!coincideMedicamento(todo, token)) return -1;
    const farmaco = dci === token || (dci.startsWith(`${token} `) && !dci.startsWith(`${token} +`));
    if (farmaco) score += 12;
    else if (dci.startsWith(token)) score += 10;
    else if (dci.split(/[^a-z0-9]+/).some((word) => word.startsWith(token))) score += 8;
    else if (coincideMedicamento(dci, token)) score += 5;
    else score += 2;
  }
  return score;
}

function paintMedSuggestions() {
  const box = document.getElementById("med-suggest");
  if (!box) return;
  anclarLista(box);
  const term = medForm.q.trim().toLowerCase();
  if (term.length < 3) {
    box.replaceChildren();
    return;
  }
  const vistos = new Set();
  const ranked = [];
  for (const med of medicamentosData) {
    const score = scoreMed(med, term);
    if (score < 0) continue;
    const clave = `${med.dci}|${med.presentacion}|${med.via}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    ranked.push({ med, score });
  }
  ranked.sort((a, b) => b.score - a.score || a.med.dci.localeCompare(b.med.dci, "es") || a.med.presentacion.localeCompare(b.med.presentacion, "es"));
  const matches = ranked.slice(0, 16);
  const resto = ranked.length - matches.length;
  const nodes = matches.map(({ med }) => {
    const button = el("button", { type: "button", class: "suggestion" }, [
      el("strong", { text: med.dci }),
      el("small", { text: med.presentacion }),
    ]);
    button.addEventListener("click", () => applyMed(med));
    return button;
  });
  if (resto > 0) nodes.push(el("p", { class: "suggest-more", text: `${resto} presentaciones más. Escribe la vía o la dosis para afinar.` }));
  box.replaceChildren(...nodes);
}

function elegirPresentacion(med) {
  medForm.presentacion = cleanText(med.presentacion, 80);
  medForm.via = VIAS.includes(med.via) ? med.via : "";
  medForm.dosis = dosisReferencia(med) || cleanText(med.presentacion, 40);
  syncCantidad();
}

function applyMed(med) {
  medForm.nombre = cleanText(med.dci, 120);
  medForm.q = "";
  cambiandoMed = false;
  elegirPresentacion(med);
  goto("medicamentos");
}

function syncCantidad() {
  medForm.cantidad = calcularCantidad(medForm.presentacion, medForm.frecuencia, medForm.duracion);
  const node = document.getElementById("med-cantidad");
  if (node) node.value = medForm.cantidad;
}

function diasField() {
  const input = el("input", {
    id: "med-dias",
    type: "number",
    min: "1",
    max: "90",
    inputmode: "numeric",
    value: medForm.dias,
  });
  input.addEventListener("input", () => {
    const n = Math.min(90, Number(onlyDigits(input.value, 2)) || 0);
    medForm.dias = n ? String(n) : "";
    input.value = medForm.dias;
    medForm.duracion = n === 1 ? "1 día" : n ? `${n} días` : "";
    syncCantidad();
  });
  return el("label", { class: "field", text: "Días" }, [input]);
}

function cantidadField() {
  const input = el("input", {
    id: "med-cantidad",
    type: "text",
    value: medForm.cantidad,
    readonly: "readonly",
    tabindex: "-1",
    placeholder: "Se calcula sola",
    "aria-readonly": "true",
  });
  return el("label", { class: "field", text: "Cantidad" }, [input]);
}

function completarIndicaciones(area) {
  const texto = indicacionesAutomaticas(draft);
  if (!texto) return;
  draft.indicacionesGenerales = texto;
  if (area) area.value = texto;
  saveDraft();
}

function scoreExam(ex, term) {
  const tokens = sinAcento(term).split(/[^a-z0-9]+/).filter((word) => word.length >= 2);
  if (!tokens.length) return -1;
  const nombre = sinAcento(ex.nombre);
  const alias = sinAcento(ex.alias);
  const grupo = sinAcento(ex.grupo);
  const todo = `${nombre} ${alias} ${grupo} ${sinAcento(ex.tipo)}`;
  let score = 0;
  for (const token of tokens) {
    const corto = token.length <= 3;
    const presente = corto
      ? new RegExp(`(?:^|[^a-z0-9])${token}(?:[^a-z0-9]|$)`).test(todo)
      : todo.includes(token);
    if (!presente) return -1;
    if (nombre.startsWith(token)) score += 10;
    else if (alias.split(/[^a-z0-9]+/).some((word) => word === token || word.startsWith(token))) score += 8;
    else if (nombre.includes(token)) score += 5;
    else score += 2;
  }
  return score;
}

function paintExamSuggestions() {
  const box = document.getElementById("exam-suggest");
  if (!box) return;
  anclarLista(box);
  const term = examQuery.trim().toLowerCase();
  if (term.length < 2) {
    box.replaceChildren();
    return;
  }
  const ranked = examenesCatalogo.flatMap((ex) => {
    if (tipoOrdenExamen(ex.tipo) !== examTipo) return [];
    const score = scoreExam(ex, term);
    return score < 0 ? [] : [{ ex, score }];
  }).sort((a, b) => b.score - a.score || a.ex.nombre.localeCompare(b.ex.nombre, "es"));
  const matches = ranked.slice(0, 16);
  const resto = ranked.length - matches.length;
  const nodes = matches.map(({ ex }) => {
    const alias = String(ex.alias || "").split(",")[0].trim();
    const button = el("button", { type: "button", class: "suggestion" }, [
      el("strong", { text: ex.nombre }),
      el("small", { text: alias && alias !== ex.nombre ? alias : ex.grupo }),
    ]);
    button.addEventListener("click", () => {
      examNombre = cleanText(ex.nombre, 160);
      examTipo = tipoOrdenExamen(ex.tipo);
      examQuery = "";
      goto("examenes");
    });
    return button;
  });
  if (resto > 0) nodes.push(el("p", { class: "suggest-more", text: `${resto} exámenes más. Escribe el nombre para afinar.` }));
  box.replaceChildren(...nodes);
}

function editarMed(med) {
  const dias = String(med.duracion || "").match(/^(\d+)/);
  medForm = {
    q: "",
    nombre: med.nombre,
    presentacion: med.presentacion,
    cantidad: med.cantidad,
    dosis: med.dosis,
    frecuencia: med.frecuencia,
    dias: dias ? dias[1] : "",
    duracion: med.duracion,
    via: med.via,
    indicaciones: med.indicaciones || "",
  };
  medEditId = med.id;
  cambiandoMed = false;
  showError("");
  composer = "med";
  goto("medicamentos");
}

function editarExamen(ex) {
  examEditId = ex.id;
  examNombre = ex.nombre;
  examTipo = ex.tipo;
  examQuery = "";
  showError("");
  composer = "exam";
  goto("examenes");
}

function openComposer(kind) {
  showError("");
  if (kind === "med") {
    medForm = emptyMedForm();
    medEditId = null;
    cambiandoMed = false;
  }
  if (kind === "exam") {
    examQuery = "";
    examNombre = "";
    examEditId = null;
  }
  composer = kind;
  render();
}

function commitMed() {
  if (medForm.dias) {
    const n = Number(medForm.dias);
    medForm.duracion = n === 1 ? "1 día" : `${n} días`;
  } else if (medForm.frecuencia === "Dosis única") {
    medForm.duracion = medForm.duracion || "Dosis única";
  }
  if (!medForm.dosis) medForm.dosis = dosisReferencia({ presentacion: medForm.presentacion }) || cleanText(medForm.presentacion, 40);
  syncCantidad();
  const med = sanitizeMed({
    id: medEditId || Date.now(),
    nombre: medForm.nombre,
    presentacion: medForm.presentacion,
    cantidad: medForm.cantidad,
    dosis: medForm.dosis,
    frecuencia: medForm.frecuencia,
    duracion: medForm.duracion,
    via: medForm.via,
    indicaciones: medForm.indicaciones,
  });
  if (!med) {
    if (!medForm.nombre || !medForm.presentacion) showError("Elige el medicamento y su presentación.");
    else if (medForm.frecuencia === "Según necesidad") showError("Esa frecuencia no calcula una cantidad.");
    else if (!medForm.dias && medForm.frecuencia !== "Dosis única") showError("Elige los días y la frecuencia.");
    else showError("Revisa la presentación, la dosis y la vía.");
    return;
  }
  if (medEditId) draft.medicamentos = draft.medicamentos.map((item) => item.id === med.id ? med : item);
  else draft.medicamentos.push(med);
  medEditId = null;
  cambiandoMed = false;
  composer = null;
  saveDraft();
  goto("medicamentos");
}

function commitExam() {
  const nombre = cleanText(examNombre || examQuery, 160);
  if (!nombre) {
    showError("Escribe el nombre del examen.");
    return;
  }
  const catalogo = catalogExam(nombre);
  const examen = sanitizeExam({
    id: examEditId || Date.now(),
    nombre,
    tipo: examTipo,
    grupo: catalogo?.grupo,
    indicaciones: catalogo?.indicacionesSug,
  });
  if (!examen) {
    showError("Elige un examen del catálogo.");
    return;
  }
  const repetido = draft.examenes.some((item) => item.id !== examen.id && sinAcento(item.nombre) === sinAcento(examen.nombre));
  if (repetido) {
    showError("Este examen ya está en la orden.");
    return;
  }
  if (examEditId) draft.examenes = draft.examenes.map((item) => item.id === examen.id ? examen : item);
  else draft.examenes.push(examen);
  examEditId = null;
  composer = null;
  examNombre = "";
  examQuery = "";
  saveDraft();
  goto("examenes");
}

function validarPaciente() {
  draft.pacienteNombre = cleanText(draft.pacienteNombre, 120);
  draft.pacienteDNI = onlyDigits(draft.pacienteDNI, 8);
  const dni = validarDni(draft.pacienteDNI);
  if (!draft.pacienteNombre) return "Escribe el nombre del paciente.";
  if (dni) return dni;
  const edad = validarEdad(draft.pacienteEdad);
  if (edad) return edad;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.fechaAtencion || "")) return "Indica la fecha de atención.";
  return "";
}

function next() {
  if (screen === "paciente") {
    const error = validarPaciente();
    if (error) {
      showError(error);
      return;
    }
    rememberPaciente();
    saveDraft();
  }
  const index = wizardIndex();
  if (index < 0 || index >= WIZARD.length - 1) return;
  goto(WIZARD[index + 1].id);
}

function savePerfilFromForm() {
  const temaInput = document.getElementById("p-tema");
  let temaVal = perfil.tema || "auto";
  if (temaInput) {
    temaVal = temaInput.value === "Oscuro" ? "dark" : temaInput.value === "Claro" ? "light" : "auto";
  }
  const nextPerfil = {
    nombre: cleanText(document.getElementById("p-nombre").value, 120),
    cmp: cleanText(document.getElementById("p-cmp").value, 20),
    especialidad: cleanText(document.getElementById("p-esp").value, 80),
    telefono: cleanText(document.getElementById("p-tel").value, 20),
    email: cleanText(document.getElementById("p-mail").value, 120),
    firmaSello: perfil.firmaSello || "",
    rubricaAjuste: sanitizeRubricaAjuste(perfil.rubricaAjuste),
    tema: temaVal,
  };
  const email = validarEmail(nextPerfil.email);
  if (email) {
    showError(email);
    return;
  }
  perfil = nextPerfil;
  aplicarTema(perfil.tema);
  savePerfil();
  leavePerfil(true);
}

function openPerfil(returnTo) {
  afterPerfil = returnTo;
  goto("perfil");
}

function leavePerfil() {
  const back = afterPerfil;
  afterPerfil = "inicio";
  goto(back);
}

async function startNew() {
  if (hasMeaningfulDraft()) {
    const ok = await ask("Borrador", "Se descartará.", "Empezar");
    if (!ok) return;
  }
  draft = emptyDraft();
  composer = null;
  enfocarDni = true;
  saveDraft();
  goto("paciente");
}

function resume() {
  composer = null;
  goto(WIZARD.some((step) => step.id === draft.screen) ? draft.screen : "paciente");
}

function resumenPaso(id) {
  if (id === "paciente") return draft.pacienteNombre || draft.pacienteDNI || "Sin paciente";
  if (id === "diagnostico") return draft.diagnostico || "Sin diagnóstico";
  if (id === "medicamentos") return draft.medicamentos.length ? String(draft.medicamentos.length) : "Ninguno";
  return draft.indicacionesGenerales ? "Listas" : "Vacías";
}

function cuerpoPaso(id) {
  if (id === "paciente") return viewPaciente();
  if (id === "diagnostico") return viewDiagnostico();
  if (id === "medicamentos") return composer === "med" ? viewMedComposer() : viewMedicamentos();
  return viewIndicaciones();
}

function abrirPanel(id) {
  if (panel === "paciente" && id !== "paciente") rememberPaciente();
  const estaba = screen === "receta" && panel === "paciente";
  if (panel !== id) {
    if (id !== "medicamentos") composer = null;
  }
  panel = panel === id ? "" : id;
  if (panel === "paciente" && !estaba) enfocarDni = true;
  if (!panel) composer = null;
  if (panel === "indicaciones" && !draft.indicacionesGenerales.trim()) {
    draft.indicacionesGenerales = indicacionesAutomaticas(draft);
  }
  draft.screen = panel || "paciente";
  saveDraft();
  render();
}

function fold(id, titulo) {
  const abierto = panel === id;
  return el("section", { class: abierto ? "fold is-open" : "fold" }, [
    el("button", {
      type: "button",
      class: "fold-head",
      "aria-expanded": abierto ? "true" : "false",
      onclick: () => abrirPanel(id),
    }, [
      el("span", { class: "fold-title", text: titulo }),
      el("span", { class: "fold-sum", text: resumenPaso(id) }),
      el("span", { class: "fold-chev", "aria-hidden": "true", text: "›" }),
    ]),
    el("div", { class: "fold-body" }, [
      el("div", { class: "fold-inner" }, abierto ? [cuerpoPaso(id)] : []),
    ]),
  ]);
}

function viewBoard() {
  return el("div", { class: "board" }, [
    errorSlot(),
    fold("paciente", "Paciente"),
    fold("diagnostico", "Diagnóstico"),
    fold("medicamentos", "Medicamentos"),
    fold("indicaciones", "Indicaciones"),
    el("button", { type: "button", class: "order-link", onclick: () => {
      origenExamenes = "receta";
      goto("examenes");
    } }, [
      el("span", { class: "order-link-mark", "aria-hidden": "true", text: "EX" }),
      el("span", {}, [
        el("strong", { text: "Solicitar exámenes" }),
        el("small", { text: draft.examenes.length
          ? `${draft.examenes.length} seleccionado${draft.examenes.length === 1 ? "" : "s"}`
          : "Laboratorio, imágenes y otros estudios" }),
      ]),
      el("span", { class: "order-link-arrow", "aria-hidden": "true", text: "›" }),
    ]),
  ]);
}

function goto(id) {
  formError = "";
  if (WIZARD.some((step) => step.id === id)) {
    if (id !== "medicamentos") composer = null;
    const estaba = screen === "receta" && panel === "paciente";
    if (panel === "paciente" && id !== "paciente") rememberPaciente();
    panel = id === "revision" ? "indicaciones" : id;
    if (panel === "paciente" && !estaba) enfocarDni = true;
    if (panel === "indicaciones" && !draft.indicacionesGenerales.trim()) {
      draft.indicacionesGenerales = indicacionesAutomaticas(draft);
    }
    screen = "receta";
    draft.screen = panel;
    saveDraft();
    render();
    return;
  }
  if (id !== "examenes") composer = null;
  screen = id;
  render();
}

function ask(title, body, confirmLabel) {
  return new Promise((resolve) => {
    dialog = { title, body, confirmLabel };
    dialogResolver = resolve;
    render();
  });
}

function finishDialog(ok) {
  const resolve = dialogResolver;
  dialog = null;
  dialogResolver = null;
  render();
  if (resolve) resolve(ok);
}

function dialogNode() {
  return el("div", { class: "dialog-back" }, [
    el("div", { class: "dialog", role: "dialog", "aria-modal": "true" }, [
      el("h2", { text: dialog.title }),
      el("p", { text: dialog.body }),
      el("div", { class: "dialog-actions" }, [
        el("button", { type: "button", class: "btn ghost", onclick: () => finishDialog(false) }, ["Cancelar"]),
        el("button", { type: "button", class: "btn", onclick: () => finishDialog(true) }, [dialog.confirmLabel]),
      ]),
    ]),
  ]);
}

function abrirModal(tipo) {
  modalActivo = tipo;
  if (tipo === "calc-pediatrica") {
    const edadNum = Number(draft.pacienteEdad);
    if (edadNum && edadNum <= 14 && (!calcState.pesoKg || calcState.pesoKg === "12")) {
      const pesoAprox = Math.max(3, Math.min(60, Math.round(edadNum * 2 + 8)));
      calcState.pesoKg = String(pesoAprox);
    }
  }
  render();
}

function cerrarModal() {
  modalActivo = null;
  render();
}

function modalNode() {
  let content = null;
  if (modalActivo === "tx-frecuentes") content = modalTxFrecuentes();
  else if (modalActivo === "guardar-tx") content = modalGuardarTx();
  else if (modalActivo === "calc-pediatrica") content = modalCalcPediatrica();
  else if (modalActivo === "packs-examenes") content = modalPacksExamenes();
  else if (modalActivo === "guardar-pack") content = modalGuardarPack();

  if (!content) return null;
  return el("div", {
    class: "modal-backdrop",
    onclick: (e) => {
      if (e.target && e.target.classList && e.target.classList.contains("modal-backdrop")) {
        cerrarModal();
      }
    },
  }, [content]);
}

function modalTxFrecuentes() {
  const lista = obtenerTratamientosFrecuentes();
  const search = el("input", {
    type: "search",
    placeholder: "Buscar por esquema, fármaco o diagnóstico...",
    value: txQuery,
    class: "field-input",
    style: "width: 100%; margin-bottom: 8px;",
  });
  search.addEventListener("input", () => {
    txQuery = cleanText(search.value, 60);
    actualizarListaTx();
  });

  const contLista = el("div", { class: "tx-list", id: "tx-cards-container" });

  const actualizarListaTx = () => {
    const q = (txQuery || "").toLowerCase().trim();
    const filtrados = lista.filter((tx) => {
      if (!q) return true;
      const texto = `${tx.nombre} ${tx.categoria} ${tx.diagnostico} ${tx.cie10} ${(tx.medicamentos || []).map((m) => m.nombre).join(" ")}`.toLowerCase();
      return texto.includes(q);
    });

    const cards = filtrados.map((tx) => {
      const medRows = (tx.medicamentos || []).map((m) =>
        el("div", { class: "tx-med-row" }, [
          el("strong", { text: `${m.nombre} (${m.presentacion || ""})` }),
          el("span", { text: `: ${m.dosis}, ${m.frecuencia} x ${m.duracion}. Cant: ${m.cantidad}` }),
        ])
      );

      return el("article", { class: "tx-card" }, [
        el("div", { class: "tx-top-row" }, [
          el("div", {}, [
            el("h4", { class: "tx-card-title", text: tx.nombre }),
            tx.diagnostico ? el("p", { class: "tx-dx-text", text: `Dx: ${tx.cie10 ? tx.cie10 + " — " : ""}${tx.diagnostico}` }) : null,
          ]),
          el("span", { class: "tx-badge", text: tx.categoria || "Esquema" }),
        ]),
        el("div", { class: "tx-meds-box" }, medRows),
        el("div", { class: "tx-card-actions" }, [
          tx.esPersonalizado ? el("button", {
            type: "button",
            class: "btn-subtle is-danger",
            style: "padding: 6px 10px; font-size: 12px; flex: none;",
            onclick: () => {
              eliminarTratamientoFrecuente(localStorage, tx.id);
              abrirModal("tx-frecuentes");
            },
          }, ["Eliminar"]) : null,
          el("button", {
            type: "button",
            class: "btn-subtle is-primary",
            style: "padding: 6px 14px; font-size: 13px; font-weight: 700; flex: none;",
            onclick: () => {
              aplicarTratamientoADraft(draft, tx);
              saveDraft();
              cerrarModal();
            },
          }, ["Aplicar a receta"]),
        ].filter(Boolean)),
      ]);
    });

    contLista.replaceChildren(...(cards.length ? cards : [
      el("p", { class: "muted", style: "text-align: center; padding: 20px;", text: "No se encontraron tratamientos con ese término." }),
    ]));
  };

  actualizarListaTx();

  return el("div", { class: "modal-window" }, [
    el("div", { class: "modal-header" }, [
      el("div", { class: "modal-title-group" }, [
        el("h2", { text: "Tratamientos Frecuentes" }),
        el("p", { text: "Aplica esquemas terapéuticos predefinidos con un solo toque." }),
      ]),
      el("button", { type: "button", class: "modal-close", onclick: cerrarModal }, ["✕"]),
    ]),
    el("div", { class: "modal-body" }, [
      search,
      contLista,
    ]),
    el("div", { class: "modal-footer" }, [
      draft.medicamentos.length > 0 ? el("button", {
        type: "button",
        class: "btn-subtle",
        onclick: () => abrirModal("guardar-tx"),
      }, ["Guardar receta actual como Tx"]) : null,
      el("button", { type: "button", class: "btn ghost", onclick: cerrarModal }, ["Cerrar"]),
    ].filter(Boolean)),
  ]);
}

function abrirGuardarTx(origenItem = null) {
  itemAGuardarTx = origenItem;
  abrirModal("guardar-tx");
}

function modalGuardarTx() {
  const fuente = itemAGuardarTx || draft;
  const esItemHistorial = Boolean(itemAGuardarTx && itemAGuardarTx.nombre);
  const nombreSugerido = fuente.diagnostico || (esItemHistorial ? `Protocolo ${fuente.nombre}` : "");
  const meds = fuente.medicamentos || [];

  const nombreInput = el("input", {
    type: "text",
    placeholder: "Ej: Esquema HTA Amlodipino + Losartán",
    value: nombreSugerido,
    maxlength: "100",
    class: "field-input",
    style: "width: 100%;",
  });
  const catInput = el("input", {
    type: "text",
    placeholder: "Ej: Medicina General, Pediatría, Cardiología",
    value: "Protocolos Personalizados",
    maxlength: "60",
    class: "field-input",
    style: "width: 100%;",
  });

  const resumenMeds = meds.map((m) =>
    el("div", { class: "tx-med-row" }, [
      el("strong", { text: `${m.nombre} (${m.presentacion || ""})` }),
      el("span", { text: ` — ${m.dosis || ""}, ${m.frecuencia || ""} x ${m.duracion || ""}` }),
    ])
  );

  return el("div", { class: "modal-window" }, [
    el("div", { class: "modal-header" }, [
      el("div", { class: "modal-title-group" }, [
        el("h2", { text: "Guardar como Tratamiento Frecuente" }),
        el("p", { text: esItemHistorial ? `Guardar el esquema de ${fuente.nombre} como protocolo reutilizable.` : "Guarda este protocolo para aplicarlo rápidamente en futuros pacientes." }),
      ]),
      el("button", { type: "button", class: "modal-close", onclick: cerrarModal }, ["✕"]),
    ]),
    el("div", { class: "modal-body" }, [
      el("label", { class: "field", text: "Nombre del protocolo / esquema" }, [nombreInput]),
      el("label", { class: "field", text: "Categoría" }, [catInput]),
      el("div", { class: "tx-meds-box" }, [
        el("span", { style: "font-size: 11px; font-weight: 700; color: var(--ink-soft); text-transform: uppercase;", text: `Medicamentos en el protocolo (${meds.length})` }),
        ...resumenMeds,
      ]),
    ]),
    el("div", { class: "modal-footer" }, [
      el("button", { type: "button", class: "btn ghost", onclick: cerrarModal }, ["Cancelar"]),
      el("button", {
        type: "button",
        class: "btn",
        onclick: () => {
          const nombre = cleanText(nombreInput.value, 100);
          if (!nombre) {
            showError("Por favor ingresa un nombre para el tratamiento.");
            render();
            return;
          }
          guardarTratamientoFrecuente(localStorage, {
            nombre,
            categoria: cleanText(catInput.value, 60) || "Protocolos Personalizados",
            cie10: fuente.cie10 || "",
            diagnostico: fuente.diagnostico || "",
            medicamentos: meds,
            indicacionesGenerales: fuente.indicacionesGenerales || "",
          });
          itemAGuardarTx = null;
          cerrarModal();
          showError("¡Protocolo guardado con éxito en Tratamientos Frecuentes!");
          render();
        },
      }, ["Guardar protocolo"]),
    ]),
  ]);
}

function modalCalcPediatrica() {
  const presets = PRESETS_PEDIATRICOS;
  const actual = presets.find((p) => p.id === calcState.presetId) || presets[0];

  const select = el("select", { class: "field-input", style: "width: 100%;" }, presets.map((p) =>
    el("option", { value: p.id, text: p.nombre })
  ));
  select.value = actual.id;

  const pesoInput = el("input", {
    type: "number",
    step: "0.5",
    min: "2",
    max: "80",
    placeholder: "Ej: 14.5",
    value: calcState.pesoKg,
    class: "field-input",
    style: "width: 100%;",
  });

  const resultadoBox = el("div", { class: "calc-result-box" });

  const recalcular = () => {
    const pId = select.value;
    const elegido = presets.find((p) => p.id === pId) || presets[0];
    calcState.presetId = elegido.id;
    calcState.farmaco = elegido.farmaco;
    calcState.presentacion = elegido.presentacion;
    calcState.via = elegido.via;
    calcState.frecuencia = elegido.frecuencia;
    calcState.duracion = elegido.duracion;
    calcState.concMg = String(elegido.concMg);
    calcState.concMl = String(elegido.concMl);
    calcState.indicacion = elegido.indicacion;
    calcState.mgKgDia = String(elegido.mgKgDia);
    calcState.tomasDia = String(elegido.tomasDia);
    calcState.pesoKg = pesoInput.value;

    const res = calcularDosisPediatrica(
      calcState.pesoKg,
      calcState.mgKgDia,
      calcState.tomasDia,
      calcState.concMg,
      calcState.concMl
    );

    if (!res) {
      resultadoBox.replaceChildren(
        el("p", { class: "muted", style: "margin: 0; text-align: center; padding: 8px;", text: "Ingresa el peso en kg para calcular la dosificación exacta." })
      );
      return;
    }

    const metricas = [
      el("div", { class: "calc-stat" }, [
        el("span", { class: "calc-stat-val", text: `${res.mlPorToma} mL` }),
        el("span", { class: "calc-stat-lbl", text: "Volumen por toma" }),
      ]),
      elegido.unidad === "gotas" ? el("div", { class: "calc-stat" }, [
        el("span", { class: "calc-stat-val", text: `${res.gotasPorToma} gotas` }),
        el("span", { class: "calc-stat-lbl", text: "Gotas aprox (20 gtt/mL)" }),
      ]) : el("div", { class: "calc-stat" }, [
        el("span", { class: "calc-stat-val", text: `${res.dosisTomaMg} mg` }),
        el("span", { class: "calc-stat-lbl", text: "Dosis mg por toma" }),
      ]),
      el("div", { class: "calc-stat" }, [
        el("span", { class: "calc-stat-val", text: `${res.dosisTotalDiaMg} mg/d` }),
        el("span", { class: "calc-stat-lbl", text: `Total día (${calcState.mgKgDia} mg/kg)` }),
      ]),
      el("div", { class: "calc-stat" }, [
        el("span", { class: "calc-stat-val", text: elegido.frecuencia }),
        el("span", { class: "calc-stat-lbl", text: `${elegido.tomasDia} tomas por día` }),
      ]),
    ];

    resultadoBox.replaceChildren(
      el("div", { class: "calc-result-header", text: "Dosificación calculada" }),
      el("div", { class: "calc-grid" }, metricas),
      el("div", { class: "calc-summary-text", text: `Pauta calculada: ${res.mlPorToma} mL ${elegido.unidad === "gotas" ? `(${res.gotasPorToma} gotas) ` : ""}${elegido.frecuencia} por ${elegido.duracion}.` })
    );
  };

  select.addEventListener("change", recalcular);
  pesoInput.addEventListener("input", recalcular);
  recalcular();

  return el("div", { class: "modal-window" }, [
    el("div", { class: "modal-header" }, [
      el("div", { class: "modal-title-group" }, [
        el("h2", { text: "Calculadora Pediátrica de Dosis" }),
        el("p", { text: "Cálculo milimétrico por peso en suspensiones y gotas pediátricas." }),
      ]),
      el("button", { type: "button", class: "modal-close", onclick: cerrarModal }, ["✕"]),
    ]),
    el("div", { class: "modal-body calc-box" }, [
      el("div", { class: "calc-field-group" }, [
        el("label", { text: "Fármaco pediátrico común" }),
        select,
      ]),
      el("div", { class: "calc-field-group" }, [
        el("label", { text: "Peso del niño en kilogramos (kg)" }),
        pesoInput,
      ]),
      resultadoBox,
    ]),
    el("div", { class: "modal-footer" }, [
      el("button", { type: "button", class: "btn ghost", onclick: cerrarModal }, ["Cancelar"]),
      el("button", {
        type: "button",
        class: "btn",
        onclick: () => {
          const res = calcularDosisPediatrica(
            calcState.pesoKg,
            calcState.mgKgDia,
            calcState.tomasDia,
            calcState.concMg,
            calcState.concMl
          );
          if (!res) {
            showError("Ingresa un peso válido para calcular.");
            render();
            return;
          }
          const elegido = presets.find((p) => p.id === select.value) || presets[0];
          const nuevoMed = {
            id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            nombre: elegido.farmaco,
            presentacion: elegido.presentacion,
            via: elegido.via,
            dosis: elegido.unidad === "gotas"
              ? `${res.gotasPorToma} gotas (${res.mlPorToma} mL)`
              : `${res.mlPorToma} mL (${res.dosisTomaMg} mg)`,
            frecuencia: elegido.frecuencia,
            duracion: elegido.duracion,
            cantidad: "1 frasco",
            indicaciones: `${elegido.indicacion} (Peso: ${calcState.pesoKg} kg · ${res.dosisTomaMg} mg/toma).`,
          };
          draft.medicamentos = [...draft.medicamentos, nuevoMed];
          saveDraft();
          cerrarModal();
        },
      }, ["Agregar a la receta"]),
    ]),
  ]);
}

function modalPacksExamenes() {
  const packs = obtenerPacksExamenes();
  const cont = el("div", { class: "tx-list" });

  const pintarPacks = () => {
    const cards = packs.map((pack) => {
      const items = (pack.examenes || []).map((ex) =>
        el("span", { class: `pack-exam-chip ${ex.tipo === "Laboratorio" ? "lab" : "img"}` }, [
          el("strong", { text: ex.nombre }),
        ])
      );

      return el("article", { class: "tx-card" }, [
        el("div", { class: "tx-top-row" }, [
          el("div", {}, [
            el("h4", { class: "tx-card-title", text: pack.nombre }),
            pack.descripcion ? el("p", { class: "tx-dx-text", text: pack.descripcion }) : null,
          ]),
          el("span", { class: "tx-badge", text: `${(pack.examenes || []).length} pruebas` }),
        ]),
        el("div", { class: "pack-items-list" }, items),
        el("div", { class: "tx-card-actions" }, [
          pack.esPersonalizado ? el("button", {
            type: "button",
            class: "btn-subtle is-danger",
            style: "padding: 6px 10px; font-size: 12px; flex: none;",
            onclick: () => {
              eliminarPackExamenes(localStorage, pack.id);
              abrirModal("packs-examenes");
            },
          }, ["Eliminar"]) : null,
          el("button", {
            type: "button",
            class: "btn-subtle is-primary",
            style: "padding: 6px 14px; font-size: 13px; font-weight: 700; flex: none;",
            onclick: () => {
              aplicarPackExamenesADraft(draft, pack);
              saveDraft();
              cerrarModal();
            },
          }, ["Aplicar a la orden"]),
        ].filter(Boolean)),
      ]);
    });
    cont.replaceChildren(...cards);
  };
  pintarPacks();

  return el("div", { class: "modal-window" }, [
    el("div", { class: "modal-header" }, [
      el("div", { class: "modal-title-group" }, [
        el("h2", { text: "Packs de Exámenes Frecuentes" }),
        el("p", { text: "Perfiles clínicos de laboratorio e imágenes prearmados." }),
      ]),
      el("button", { type: "button", class: "modal-close", onclick: cerrarModal }, ["✕"]),
    ]),
    el("div", { class: "modal-body" }, [cont]),
    el("div", { class: "modal-footer" }, [
      draft.examenes.length > 0 ? el("button", {
        type: "button",
        class: "btn-subtle",
        onclick: () => abrirModal("guardar-pack"),
      }, ["Guardar orden actual como Pack"]) : null,
      el("button", { type: "button", class: "btn ghost", onclick: cerrarModal }, ["Cerrar"]),
    ].filter(Boolean)),
  ]);
}

function modalGuardarPack() {
  const nombreInput = el("input", {
    type: "text",
    placeholder: "Ej: Perfil Reumatológico, Chequeo Anual",
    value: "",
    maxlength: "100",
    class: "field-input",
    style: "width: 100%;",
  });
  const descInput = el("input", {
    type: "text",
    placeholder: "Ej: Evaluación de artralgias e inflamación",
    value: "",
    maxlength: "160",
    class: "field-input",
    style: "width: 100%;",
  });

  const resumenExamenes = draft.examenes.map((e) =>
    el("div", { class: "tx-med-row" }, [
      el("strong", { text: e.nombre }),
      el("span", { class: "muted", text: ` [${e.tipo || "Estudio"}]` }),
    ])
  );

  return el("div", { class: "modal-window" }, [
    el("div", { class: "modal-header" }, [
      el("div", { class: "modal-title-group" }, [
        el("h2", { text: "Guardar como Pack de Exámenes" }),
        el("p", { text: "Crea un perfil reutilizable con los exámenes seleccionados." }),
      ]),
      el("button", { type: "button", class: "modal-close", onclick: cerrarModal }, ["✕"]),
    ]),
    el("div", { class: "modal-body" }, [
      el("label", { class: "field", text: "Nombre del pack" }, [nombreInput]),
      el("label", { class: "field", text: "Descripción" }, [descInput]),
      el("div", { class: "tx-meds-box" }, [
        el("span", { style: "font-size: 11px; font-weight: 700; color: var(--ink-soft); text-transform: uppercase;", text: `Exámenes en la orden (${draft.examenes.length})` }),
        ...resumenExamenes,
      ]),
    ]),
    el("div", { class: "modal-footer" }, [
      el("button", { type: "button", class: "btn ghost", onclick: cerrarModal }, ["Cancelar"]),
      el("button", {
        type: "button",
        class: "btn",
        onclick: () => {
          const nombre = cleanText(nombreInput.value, 100);
          if (!nombre) {
            showError("Por favor ingresa un nombre para el pack.");
            render();
            return;
          }
          guardarPackExamenes(localStorage, {
            nombre,
            descripcion: cleanText(descInput.value, 160) || "Pack personalizado",
            examenes: draft.examenes,
          });
          cerrarModal();
        },
      }, ["Guardar pack"]),
    ]),
  ]);
}

function fechaGuion(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return "";
  const [anio, mes, dia] = iso.split("-");
  return `${dia} / ${mes} / ${anio}`;
}

function casilla(doc, x, y, marcada) {
  doc.setDrawColor(18, 54, 82);
  doc.setLineWidth(0.3);
  doc.rect(x, y, 3.1, 3.1);
  if (!marcada) return;
  doc.setLineWidth(0.45);
  doc.line(x + 0.5, y + 1.5, x + 1.2, y + 2.4);
  doc.line(x + 1.2, y + 2.4, x + 2.6, y + 0.6);
}

function campoReceta(doc, etiqueta, valor, x, y, ancho) {
  doc.setFont("times", "bold");
  doc.setFontSize(8);
  doc.setTextColor(18, 54, 82);
  doc.text(etiqueta, x, y);
  const inicio = x + doc.getTextWidth(etiqueta) + 1.3;
  const libre = Math.max(6, x + ancho - inicio);
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  const texto = doc.splitTextToSize(String(valor || ""), libre)[0] || "";
  if (texto) doc.text(texto, inicio, y);
  doc.setDrawColor(168, 188, 208);
  doc.setLineWidth(0.2);
  doc.line(inicio, y + 1.1, x + ancho, y + 1.1);
}

function lineasColumna(doc, lineas, x, y, ancho, limite) {
  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.setTextColor(18, 54, 82);
  let cursor = y;
  for (const linea of lineas) {
    const partes = doc.splitTextToSize(String(linea || ""), ancho);
    for (const parte of partes) {
      if (cursor > limite) return;
      doc.text(parte, x, cursor);
      cursor += 4.5;
    }
  }
}

function dibujarReceta(doc, top, alto) {
  const x = 8;
  const ancho = 194;
  const tinta = [18, 54, 82];
  const fondo = [215, 228, 240];
  doc.setDrawColor(...tinta);
  doc.setLineWidth(0.45);
  doc.roundedRect(x, top, ancho, alto, 2.4, 2.4);
  doc.setFillColor(...fondo);
  doc.roundedRect(x, top, ancho, 16, 2.4, 2.4, "F");
  doc.rect(x, top + 10, ancho, 6, "F");
  doc.setDrawColor(...tinta);
  doc.line(x, top + 16, x + ancho, top + 16);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x + 4, top + 2.2, 14, 11.6, 1.4, 1.4, "FD");
  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...tinta);
  doc.text("LR", x + 11, top + 10, { align: "center" });

  const nombre = (perfil.nombre || "").toUpperCase();
  doc.setFontSize(11);
  const titulo = doc.splitTextToSize(nombre, 128)[0] || "";
  doc.text(titulo, x + ancho / 2, top + 7.2, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(8);
  const credencial = [perfil.especialidad, perfil.cmp ? `CMP ${perfil.cmp}` : ""].filter(Boolean).join("  |  ").toUpperCase();
  doc.text(doc.splitTextToSize(credencial, 128)[0] || "", x + ancho / 2, top + 12.4, { align: "center" });

  const cx = x + ancho - 12;
  const cy = top + 8.2;
  doc.setLineWidth(0.35);
  doc.circle(cx, cy - 4.2, 1.15);
  doc.line(cx, cy - 3, cx, cy + 4.2);
  doc.line(cx - 2.4, cy + 4.2, cx, cy + 2);
  doc.line(cx + 2.4, cy + 4.2, cx, cy + 2);
  doc.line(cx, cy - 2.2, cx + 2.1, cy - 0.6);
  doc.line(cx + 2.1, cy - 0.6, cx, cy + 1);
  doc.line(cx, cy + 1, cx - 2.1, cy + 2.5);

  let y = top + 22;
  campoReceta(doc, "Paciente:", draft.pacienteNombre, x + 4, y, 128);
  campoReceta(doc, "Fecha:", fechaGuion(draft.fechaAtencion), x + 136, y, 54);
  y += 6.4;
  campoReceta(doc, "Edad:", draft.pacienteEdad, x + 4, y, 28);
  doc.setFont("times", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...tinta);
  doc.text("Sexo:", x + 36, y);
  doc.setFont("times", "normal");
  doc.text("M", x + 48, y);
  casilla(doc, x + 52, y - 2.5, draft.pacienteSexo === "M");
  doc.text("F", x + 58, y);
  casilla(doc, x + 61.5, y - 2.5, draft.pacienteSexo === "F");
  campoReceta(doc, "DNI:", draft.pacienteDNI, x + 70, y, 52);
  campoReceta(doc, "H. Clínica:", draft.pacienteDNI, x + 126, y, 64);
  y += 6.4;
  campoReceta(doc, "Diagnóstico:", draft.diagnostico, x + 4, y, 128);
  campoReceta(doc, "CIE-10:", draft.cie10, x + 136, y, 54);

  const colTop = y + 4;
  const colAlto = alto - (colTop - top) - 16;
  const colAncho = 92;
  doc.setDrawColor(...tinta);
  doc.setLineWidth(0.35);
  doc.roundedRect(x + 3, colTop, colAncho, colAlto, 1.6, 1.6);
  doc.roundedRect(x + 99, colTop, colAncho, colAlto, 1.6, 1.6);
  doc.setFont("times", "bolditalic");
  doc.setFontSize(12);
  doc.text("Rp/", x + 7, colTop + 6);
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("Indicaciones:", x + 103, colTop + 6);

  doc.setFont("times", "bold");
  doc.setFontSize(36);
  doc.setTextColor(232, 239, 246);
  doc.text("LR", x + ancho / 2, colTop + colAlto / 2 + 4, { align: "center" });

  doc.setDrawColor(186, 204, 220);
  doc.setLineWidth(0.15);
  const primera = colTop + 12;
  const ultima = colTop + colAlto - 4;
  for (let linea = primera; linea <= ultima; linea += 4.5) {
    doc.line(x + 6, linea, x + 3 + colAncho - 3, linea);
    doc.line(x + 102, linea, x + 99 + colAncho - 3, linea);
  }

  const rp = [];
  draft.medicamentos.forEach((med, index) => {
    rp.push(`${index + 1}. ${med.nombre} — ${med.presentacion}`);
    const pauta = [`Cant. ${med.cantidad}`, med.dosis, med.frecuencia, med.duracion, med.via].filter(Boolean).join(", ");
    if (pauta) rp.push(pauta);
    if (med.indicaciones) rp.push(med.indicaciones);
  });
  const notas = [
    ...String(draft.indicacionesGenerales || "").split("\n").map((linea) => linea.trim()).filter(Boolean),
  ];
  lineasColumna(doc, rp, x + 6, primera - 1.5, colAncho - 8, ultima - 2);
  lineasColumna(doc, notas, x + 102, primera - 1.5, colAncho - 8, ultima - 2);

  const pie = top + alto - 8;
  doc.setFont("times", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...tinta);
  doc.text("Próximo control:", x + 6, pie);
  doc.setFont("times", "normal");
  doc.text(fechaGuion(draft.proximoControl), x + 34, pie);
  doc.setDrawColor(168, 188, 208);
  doc.line(x + 34, pie + 1.1, x + 78, pie + 1.1);
  if (perfil.firmaSello) {
    try {
      const ajuste = sanitizeRubricaAjuste(perfil.rubricaAjuste);
      const baseW = 36;
      const baseH = 12;
      const w = baseW * ajuste.escala;
      const h = baseH * ajuste.escala;
      // Convertir desplazamiento de pixels a mm aproximados (aprox 0.26 mm por pixel en pantalla)
      const offX = ajuste.offsetX * 0.26;
      const offY = ajuste.offsetY * 0.26;
      const posX = (x + 137 + (baseW - w) / 2) + offX;
      const posY = (pie - 19 + (baseH - h) / 2) + offY;
      doc.addImage(perfil.firmaSello, "PNG", posX, posY, w, h, undefined, "FAST");
    } catch {}
  }
  doc.line(x + 124, pie - 6, x + 186, pie - 6);
  doc.setFont("times", "bold");
  doc.text("Firma y Sello", x + 155, pie, { align: "center" });
  doc.setDrawColor(...tinta);
  doc.setLineWidth(0.45);
  doc.roundedRect(x, top, ancho, alto, 2.4, 2.4);
}

function generarOrdenExamenes() {
  if (busy) return;
  showError("");
  const pacienteError = validarPaciente();
  if (!perfilListo(perfil)) {
    showError("Completa tu nombre y CMP en el perfil antes de generar.");
    return;
  }
  if (pacienteError) {
    showError(pacienteError);
    return;
  }
  if (!draft.examenes.length) {
    showError("Agrega al menos un examen.");
    return;
  }
  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) {
    showError("No se pudo cargar el generador de PDF.");
    return;
  }
  rememberPaciente();
  busy = true;
  render();
  try {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const tinta = [17, 58, 87];
    const suave = [92, 111, 127];
    const dibujarCabecera = () => {
      doc.setFillColor(...tinta);
      doc.rect(0, 0, 210, 30, "F");
      doc.setTextColor(255);
      doc.setFont("times", "bold");
      doc.setFontSize(17);
      doc.text(perfil.nombre || "Médico", 16, 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text([perfil.especialidad, perfil.cmp ? `CMP ${perfil.cmp}` : ""].filter(Boolean).join(" · "), 16, 20);
      doc.setFont("times", "bold");
      doc.setFontSize(15);
      doc.text("ORDEN DE EXÁMENES", 194, 15, { align: "right" });
      doc.setTextColor(...tinta);
      doc.setFontSize(11);
      doc.text(draft.pacienteNombre, 16, 42);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const paciente = [
        draft.pacienteDNI ? `DNI: ${draft.pacienteDNI}` : "",
        draft.pacienteEdad ? `Edad: ${draft.pacienteEdad} años` : "",
        draft.pacienteSexo ? `Sexo: ${draft.pacienteSexo}` : "",
        `Fecha: ${fechaLegible(draft.fechaAtencion)}`,
      ].filter(Boolean).join("   ·   ");
      doc.text(paciente, 16, 49);
      if (draft.diagnostico) {
        doc.setTextColor(...suave);
        doc.text(`Diagnóstico: ${[draft.cie10, draft.diagnostico].filter(Boolean).join(" — ")}`, 16, 56);
      }
      doc.setDrawColor(194, 207, 218);
      doc.line(16, 61, 194, 61);
    };
    dibujarCabecera();
    let y = 70;
    for (const tipo of ["Laboratorio", "Imágenes"]) {
      const items = draft.examenes.filter((ex) => ex.tipo === tipo);
      if (!items.length) continue;
      if (y > 245) {
        doc.addPage();
        dibujarCabecera();
        y = 70;
      }
      doc.setTextColor(...tinta);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(tipo === "Laboratorio" ? "LABORATORIO" : "IMÁGENES Y OTROS ESTUDIOS", 16, y);
      y += 7;
      for (const ex of items) {
        const guia = ex.indicaciones ? doc.splitTextToSize(ex.indicaciones, 158) : [];
        const alto = 8 + guia.length * 4;
        if (y + alto > 267) {
          doc.addPage();
          dibujarCabecera();
          y = 70;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(24, 44, 61);
        doc.text(`• ${ex.nombre}`, 19, y);
        if (ex.grupo) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...suave);
          doc.text(ex.grupo, 190, y, { align: "right" });
        }
        y += 5;
        if (guia.length) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(...suave);
          doc.text(guia, 23, y);
          y += guia.length * 4;
        }
        y += 4;
      }
    }
    if (y > 260) {
      doc.addPage();
      dibujarCabecera();
      y = 250;
    } else {
      y = Math.max(y + 8, 250);
    }
    if (perfil.firmaSello) {
      try {
        const ajuste = sanitizeRubricaAjuste(perfil.rubricaAjuste);
        const baseW = 36;
        const baseH = 12;
        const w = baseW * ajuste.escala;
        const h = baseH * ajuste.escala;
        const offX = ajuste.offsetX * 0.26;
        const offY = ajuste.offsetY * 0.26;
        const posX = (139 + (baseW - w) / 2) + offX;
        const posY = (y - 13 + (baseH - h) / 2) + offY;
        doc.addImage(perfil.firmaSello, "PNG", posX, posY, w, h, undefined, "FAST");
      } catch {}
    }
    doc.setDrawColor(130, 151, 168);
    doc.line(126, y, 188, y);
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...tinta);
    doc.text("Firma y Sello", 157, y + 5, { align: "center" });
    doc.save(`Orden_examenes_${fileSlug(draft.pacienteNombre)}.pdf`);
    guardarUltima();
    composer = null;
    screen = origenExamenes === "inicio" ? "inicio" : "receta";
    if (screen === "receta") panel = "indicaciones";
  } catch {
    showError("No se pudo generar la orden de exámenes.");
  } finally {
    busy = false;
    render();
  }
}

function generarPDF() {
  if (busy) return;
  showError("");
  const pacienteError = validarPaciente();
  if (!perfilListo(perfil)) {
    showError("Completa tu nombre y CMP en el perfil antes de generar.");
    return;
  }
  if (pacienteError) {
    showError(pacienteError);
    return;
  }
  if (!draft.medicamentos.length) {
    showError("Agrega al menos un medicamento.");
    return;
  }
  if (!draft.indicacionesGenerales.trim()) {
    draft.indicacionesGenerales = indicacionesAutomaticas(draft);
  }
  rememberPaciente();
  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) {
    showError("No se pudo cargar el generador de PDF.");
    return;
  }
  busy = true;
  render();
  try {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const alto = 142;
    dibujarReceta(doc, 5, alto);
    dibujarReceta(doc, 150, alto);
    doc.setDrawColor(180, 196, 214);
    doc.setLineDashPattern([0.7, 0.8], 0);
    doc.setLineWidth(0.2);
    doc.line(12, 148.6, 198, 148.6);
    doc.setLineDashPattern([], 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(110);
    const generado = new Date().toLocaleString("es-PE", {
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });
    doc.text(`Generado localmente el ${generado}. Este PDF no incluye firma digital.`, 105, 294.6, { align: "center" });
    doc.save(`Receta_${fileSlug(draft.pacienteNombre)}.pdf`);
    guardarUltima();
    ultimoEmitido = {
      tipo: "receta",
      pacienteNombre: draft.pacienteNombre,
      pacienteDNI: draft.pacienteDNI,
      pacienteEdad: draft.pacienteEdad,
      pacienteSexo: draft.pacienteSexo,
      diagnostico: [draft.cie10, draft.diagnostico].filter(Boolean).join(" — "),
      fechaAtencion: draft.fechaAtencion,
      medicamentos: draft.medicamentos.map((m) => ({ ...m })),
      indicacionesGenerales: draft.indicacionesGenerales,
      proximoControl: draft.proximoControl,
    };
    draft = emptyDraft();
    composer = null;
    sessionStorage.removeItem(DRAFT_KEY);
    screen = "listo";
  } catch {
    showError("No se pudo generar el PDF.");
  } finally {
    busy = false;
    render();
  }
}

async function boot() {
  aplicarTema(perfil.tema);
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator && typeof location !== "undefined" && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
  const sesion = leerSesion();
  const nombre = String(sesion?.email || "").split("@")[0];
  if (/^[a-z0-9._-]{3,40}$/.test(nombre)) loginUsuario = nombre;
  screen = "login";
  render();
}

boot();
