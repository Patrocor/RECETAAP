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
} from "./automatizar.js";
import {
  actualizarAcceso,
  crearAcceso,
  cuentaGuardada,
  entrar,
  listarAccesos,
  salir,
} from "./auth.js";

const PERFIL_KEY = "recetapp.perfil";
const PACIENTES_KEY = "recetapp.pacientes";
const DRAFT_KEY = "recetapp.borrador";

const WIZARD = [
  { id: "paciente", titulo: "Paciente" },
  { id: "diagnostico", titulo: "Diagnóstico" },
  { id: "medicamentos", titulo: "Medicamentos" },
  { id: "examenes", titulo: "Exámenes" },
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

const SISTEMAS = [...new Set(cie10Data.map((dx) => dx.sistema).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, "es"));

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

const SUBTIPOS = [...new Set(cie10Data.map((dx) => dx.subtipo).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, "es"));

const ALIAS_SISTEMA = {
  "Salud mental": "Salud Mental",
  "Músculo-esquelético": "Musculoesquelético",
  "Infeccioso": "Infecciosas",
  "Neoplasias": "Oncología",
  "Metabólico": "Endocrino/Metabólico",
  "Traumatología": "Traumatismos",
  "Síntomas generales": "Síntomas y Signos",
};

function etiquetaTipo(id) {
  return TIPOS.find((tipo) => tipo.id === id)?.label || "";
}

const TIPOS_EXAMEN = ["Laboratorio", "Imágenes", "Procedimientos"];

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
    filtroSistema: "",
    filtroTipo: "",
    filtroSubtipo: "",
    medicamentos: [],
    examenes: [],
    filtroExamen: "",
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
let filtrosAbiertos = false;
let detalleMed = false;
let cuenta = null;
let accesos = [];
let adminAbierto = "";
let adminQuery = "";
let loginUsuario = "";
let loginClave = "";
let composer = null;
let medForm = emptyMedForm();
let examQuery = "";
let examNombre = "";
let dialog = null;
let dialogResolver = null;
let busy = false;
let formError = "";
let afterPerfil = "inicio";

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
    };
  } catch {
    return emptyPerfil();
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
    const sistemaGuardado = ALIAS_SISTEMA[raw.filtroSistema] || raw.filtroSistema;
    base.filtroSistema = SISTEMAS.includes(sistemaGuardado) ? sistemaGuardado : "";
    base.filtroTipo = TIPOS.some((t) => t.id === raw.filtroTipo) ? raw.filtroTipo : "";
    base.filtroSubtipo = SUBTIPOS.includes(raw.filtroSubtipo) ? raw.filtroSubtipo : "";
    base.filtroExamen = TIPOS_EXAMEN.includes(raw.filtroExamen) ? raw.filtroExamen : "";
    base.indicacionesGenerales = cleanMultiline(raw.indicacionesGenerales, 800);
    base.medicamentos = Array.isArray(raw.medicamentos) ? raw.medicamentos.map(sanitizeMed).filter(Boolean).slice(0, 30) : [];
    base.examenes = Array.isArray(raw.examenes)
      ? raw.examenes.map((ex) => ({
        id: Number(ex?.id) || Date.now(),
        nombre: cleanText(ex?.nombre, 160),
      })).filter((ex) => ex.nombre).slice(0, 30)
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
  const shell = el("div", { class: "shell" }, [header(), el("main", { class: "main" }, [view()]), footer()]);
  if (dialog) shell.append(dialogNode());
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
  } else if (screen === "admin") {
    title = "Admin";
    onBack = () => goto("inicio");
  } else if (screen === "perfil") {
    title = "Perfil";
    onBack = () => leavePerfil(false);
  } else if (screen === "listo") {
    title = "Listo";
    onBack = () => goto("inicio");
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
      el("div", {}, [
        screen === "inicio" || screen === "login"
          ? el("div", { class: "brand" }, [
            el("img", { class: "logo", src: "logo.svg", alt: "LR" }),
            el("div", { class: "wordmark", text: "RecetAPP" }),
          ])
          : el("h1", { text: title }),
        kicker ? el("p", { class: "step-label", text: kicker }) : null,
      ]),
    ]),
    progress,
  ]);
}

function footer() {
  if (screen === "inicio" || screen === "listo" || screen === "admin") return null;
  if (screen === "receta") {
    const agregando = composer === "med" || composer === "exam";
    return el("footer", { class: "footer" }, [
      el("button", {
        type: "button",
        class: "btn",
        disabled: busy,
        onclick: composer === "med" ? commitMed : composer === "exam" ? commitExam : generarPDF,
      }, [agregando ? "Agregar" : (busy ? "Generando…" : "Generar PDF")]),
    ]);
  }
  if (screen === "login") {
    return el("footer", { class: "footer" }, [
      el("button", { type: "button", class: "btn", disabled: busy, onclick: enviarLogin }, [busy ? "Ingresando…" : "Ingresar"]),
    ]);
  }
  let label = "Continuar";
  let action = next;
  if (screen === "perfil") {
    label = "Guardar";
    action = savePerfilFromForm;
  } else if (composer === "med") {
    label = "Agregar";
    action = commitMed;
  } else if (composer === "exam") {
    label = "Agregar";
    action = commitExam;
  } else if (screen === "examenes" && !draft.examenes.length) label = "Omitir";
  else if (screen === "indicaciones") label = "Revisar";
  else if (screen === "revision") {
    label = busy ? "Generando…" : "Generar PDF";
    action = generarPDF;
  }
  return el("footer", { class: "footer" }, [
    el("button", { type: "button", class: "btn", disabled: busy, onclick: action }, [label]),
  ]);
}

function view() {
  if (screen === "login") return viewLogin();
  if (screen === "admin") return viewAdmin();
  if (screen === "receta") return viewBoard();
  if (screen === "inicio") return viewInicio();
  if (screen === "perfil") return viewPerfil();
  if (screen === "listo") return viewListo();
  if (screen === "paciente") return viewPaciente();
  if (screen === "diagnostico") return viewDiagnostico();
  if (screen === "medicamentos") return composer === "med" ? viewMedComposer() : viewMedicamentos();
  if (screen === "examenes") return composer === "exam" ? viewExamComposer() : viewExamenes();
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
  return el("section", { class: "screen stack" }, [
    errorSlot(),
    el("label", { class: "field", text: "Usuario" }, [usuario]),
    el("label", { class: "field", text: "Contraseña" }, [clave]),
  ]);
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

function viewInicio() {
  const blocks = [
    el("button", { type: "button", class: "profile-row", onclick: () => openPerfil("inicio") }, [
      el("div", { class: "avatar", text: initials(perfil.nombre) }),
      el("div", {}, [
        el("div", { class: "profile-name", text: perfil.nombre || "Perfil" }),
        perfil.cmp ? el("div", { class: "profile-sub", text: `CMP ${perfil.cmp}` }) : null,
      ]),
      el("span", { class: "chev", "aria-hidden": "true", text: "›" }),
    ]),
    el("button", { type: "button", class: "cta", onclick: startNew }, [
      el("span", { class: "cta-title", text: "Nueva receta" }),
    ]),
    cuenta?.isAdmin ? el("button", { type: "button", class: "secondary-card", onclick: abrirAdmin }, [
      el("div", { class: "profile-name", text: "Admin" }),
      el("span", { class: "chev", "aria-hidden": "true", text: "›" }),
    ]) : null,
    el("button", { type: "button", class: "secondary-card", onclick: salirDeLaApp }, [
      el("div", { class: "profile-name", text: "Salir" }),
    ]),
  ];
  if (hasMeaningfulDraft()) {
    blocks.push(el("button", { type: "button", class: "secondary-card", onclick: resume }, [
      el("div", {}, [
        el("div", { class: "profile-name", text: "Borrador" }),
        draft.pacienteNombre ? el("div", { class: "profile-sub", text: draft.pacienteNombre }) : null,
      ]),
      el("span", { class: "chev", "aria-hidden": "true", text: "›" }),
    ]));
  }
  return el("section", { class: "screen stack home" }, blocks);
}

function viewPerfil() {
  return el("section", { class: "screen stack" }, [
    errorSlot(),
    field("Nombre", "p-nombre", perfil.nombre, "text", "", null, { autocomplete: "name", name: "name" }),
    field("CMP", "p-cmp", perfil.cmp, "text", "12345", null, { autocomplete: "on", name: "cmp" }),
    field("Especialidad", "p-esp", perfil.especialidad, "text", "Medicina general", null, { autocomplete: "organization-title", name: "organization-title" }),
    field("Teléfono", "p-tel", perfil.telefono, "tel", "999000111", null, { autocomplete: "tel", name: "tel", inputmode: "tel" }),
    field("Correo", "p-mail", perfil.email, "email", "ana@ejemplo.pe", null, { autocomplete: "email", name: "email" }),
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
  dni.querySelector("input").addEventListener("change", () => alCambiarDni(dni.querySelector("input")));
  const section = el("section", { class: "screen stack" }, [
    dni,
    el("div", { id: "pac-suggest", class: "suggestions" }),
    field("Nombre", "paciente-nombre", draft.pacienteNombre, "text", "", (input) => {
      draft.pacienteNombre = cleanText(input.value, 120);
      const exactos = gente.filter((paciente) => paciente.nombre.toLowerCase() === draft.pacienteNombre.toLowerCase());
      if (exactos.length === 1) applyPaciente(exactos[0]);
      saveDraft();
      pintarResumen("paciente");
      paintPacSuggestions();
    }, { autocomplete: "name", name: "name", list: "lista-nombres" }),
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
    el("datalist", { id: "lista-dni" }, gente.filter((paciente) => paciente.dni).map((paciente) => (
      el("option", { value: paciente.dni, label: paciente.nombre })
    ))),
    el("datalist", { id: "lista-nombres" }, gente.map((paciente) => (
      el("option", { value: paciente.nombre, label: paciente.dni || "" })
    ))),
  ]);
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
    }).slice(0, 2);
  box.replaceChildren(...matches.map((paciente) => {
    const button = el("button", { type: "button", class: "suggestion" }, [
      el("strong", { text: paciente.dni || paciente.nombre }),
      el("small", { text: [paciente.dni ? paciente.nombre : "", paciente.edad ? `${paciente.edad} años` : "", paciente.sexo].filter(Boolean).join(" · ") }),
    ]);
    button.addEventListener("click", () => {
      applyPaciente(paciente);
      paintPacSuggestions();
    });
    return button;
  }));
}

function viewDiagnostico() {
  const section = el("section", { class: "screen stack" }, [
    el("button", {
      type: "button",
      class: filtrosAbiertos ? "add-btn is-on" : "add-btn",
      onclick: () => {
        filtrosAbiertos = !filtrosAbiertos;
        goto("diagnostico");
      },
    }, ["Filtros"]),
  ]);
  if (filtrosAbiertos) {
    const sistema = el("select", {}, [
      el("option", { value: "", text: "Todos" }),
      ...SISTEMAS.map((nombre) => el("option", { value: nombre, text: nombre })),
    ]);
    sistema.value = draft.filtroSistema;
    sistema.addEventListener("change", () => {
      draft.filtroSistema = SISTEMAS.includes(sistema.value) ? sistema.value : "";
      if (draft.filtroSubtipo && !subtiposVisibles().includes(draft.filtroSubtipo)) draft.filtroSubtipo = "";
      saveDraft();
      goto("diagnostico");
    });
    section.append(el("label", { class: "field", text: "Sistema" }, [sistema]));
    const tipo = el("select", {}, [
      el("option", { value: "", text: "Todos" }),
      ...TIPOS.map((item) => el("option", { value: item.id, text: item.label })),
    ]);
    tipo.value = draft.filtroTipo;
    tipo.addEventListener("change", () => {
      draft.filtroTipo = TIPOS.some((item) => item.id === tipo.value) ? tipo.value : "";
      if (draft.filtroSubtipo && !subtiposVisibles().includes(draft.filtroSubtipo)) draft.filtroSubtipo = "";
      saveDraft();
      goto("diagnostico");
    });
    section.append(el("label", { class: "field", text: "Tipo" }, [tipo]));
    const subtipo = el("select", {}, [
      el("option", { value: "", text: "Todos" }),
      ...subtiposVisibles().map((nombre) => el("option", { value: nombre, text: nombre })),
    ]);
    subtipo.value = draft.filtroSubtipo;
    subtipo.addEventListener("change", () => {
      draft.filtroSubtipo = subtiposVisibles().includes(subtipo.value) ? subtipo.value : "";
      saveDraft();
      paintDxSuggestions();
    });
    section.append(el("label", { class: "field", text: "Subtipo" }, [subtipo]));
  }
  const search = el("input", {
    id: "dx-query",
    type: "text",
    value: draft.dxQuery,
    placeholder: "",
    maxlength: "80",
    autocomplete: "off",
  });
  search.addEventListener("input", () => {
    draft.dxQuery = cleanText(search.value, 80);
    saveDraft();
    paintDxSuggestions();
  });
  section.append(el("label", { class: "field", text: "Buscar" }, [search]));
  section.append(el("div", { id: "dx-suggest", class: "suggestions" }));
  if (draft.diagnostico) {
    section.append(el("article", { class: "item" }, [
      el("div", { class: "item-top" }, [
        el("h3", { text: "Diagnóstico" }),
        el("button", { type: "button", class: "text-danger", onclick: () => {
          draft.diagnostico = "";
          draft.cie10 = "";
          saveDraft();
          goto("diagnostico");
        } }, ["Quitar"]),
      ]),
      el("p", { text: [draft.cie10, draft.diagnostico].filter(Boolean).join(" — ") }),
    ]));
  }
  queueMicrotask(paintDxSuggestions);
  return section;
}

function viewMedicamentos() {
  const list = draft.medicamentos.length
    ? draft.medicamentos.map(medCard)
    : [el("p", { class: "muted", text: "Sin medicamentos" })];
  return el("section", { class: "screen stack" }, [
    ...list,
    el("button", { type: "button", class: "add-btn", onclick: () => openComposer("med") }, ["Agregar"]),
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
    placeholder: "",
    maxlength: "80",
    autocomplete: "off",
  });
  buscar.addEventListener("input", () => {
    medForm.q = cleanText(buscar.value, 80);
    paintMedSuggestions();
  });
  const section = el("section", { class: "screen stack" }, [
    el("label", { class: "field", text: "Buscar" }, [buscar]),
    el("div", { id: "med-suggest", class: "suggestions" }),
  ]);
  if (opciones.length) {
    const select = el("select", { id: "med-presentacion" }, opciones.map((med) => (
      el("option", { value: med.presentacion, text: med.presentacion })
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
    });
    section.append(el("label", { class: "field", text: "Presentación" }, [select]));
  }
  section.append(el("div", { class: "two" }, [
    diasField(),
    selectField("Frecuencia", "med-frecuencia", FRECUENCIAS, medForm.frecuencia, (value) => {
      medForm.frecuencia = FRECUENCIAS.includes(value) ? value : "";
      syncCantidad();
    }),
  ]));
  section.append(cantidadField());
  section.append(el("button", {
    type: "button",
    class: detalleMed ? "add-btn is-on" : "add-btn",
    onclick: () => {
      detalleMed = !detalleMed;
      goto("medicamentos");
    },
  }, ["Detalle"]));
  if (detalleMed) {
    if (!opciones.length) {
      section.append(medInput("Nombre", "med-nombre", "nombre", ""));
      section.append(medInput("Presentación", "med-presentacion", "presentacion", ""));
    }
    section.append(el("div", { class: "two" }, [
      medInput("Dosis", "med-dosis", "dosis", ""),
      selectField("Vía", "med-via", VIAS, medForm.via, (value) => {
        medForm.via = value;
      }),
    ]));
    section.append(medInput("Indicaciones", "med-indicaciones", "indicaciones", ""));
  }
  queueMicrotask(paintMedSuggestions);
  return section;
}

function viewExamenes() {
  const list = draft.examenes.length
    ? draft.examenes.map(examCard)
    : [el("p", { class: "muted", text: "Sin exámenes" })];
  return el("section", { class: "screen stack" }, [
    ...list,
    el("button", { type: "button", class: "add-btn", onclick: () => openComposer("exam") }, ["Agregar"]),
  ]);
}

function viewExamComposer() {
  const section = el("section", { class: "screen stack" }, [
    el("button", {
      type: "button",
      class: filtrosAbiertos ? "add-btn is-on" : "add-btn",
      onclick: () => {
        filtrosAbiertos = !filtrosAbiertos;
        goto("examenes");
      },
    }, ["Filtros"]),
  ]);
  if (filtrosAbiertos) {
    const tipo = el("select", {}, [
      el("option", { value: "", text: "Todos" }),
      ...TIPOS_EXAMEN.map((nombre) => el("option", { value: nombre, text: nombre })),
    ]);
    tipo.value = draft.filtroExamen;
    tipo.addEventListener("change", () => {
      draft.filtroExamen = TIPOS_EXAMEN.includes(tipo.value) ? tipo.value : "";
      saveDraft();
      paintExamSuggestions();
    });
    section.append(el("label", { class: "field", text: "Tipo" }, [tipo]));
  }
  const search = el("input", {
    id: "exam-q",
    type: "search",
    value: examQuery,
    placeholder: "",
    maxlength: "80",
    autocomplete: "off",
  });
  search.addEventListener("input", () => {
    examQuery = cleanText(search.value, 80);
    paintExamSuggestions();
  });
  section.append(el("label", { class: "field", text: "Buscar" }, [search]));
  section.append(el("div", { id: "exam-suggest", class: "suggestions" }));
  const nombre = el("input", {
    id: "exam-nombre",
    type: "text",
    value: examNombre,
    maxlength: "160",
    autocomplete: "off",
  });
  nombre.addEventListener("input", () => {
    examNombre = cleanText(nombre.value, 160);
  });
  section.append(el("label", { class: "field", text: "Examen" }, [nombre]));
  queueMicrotask(paintExamSuggestions);
  return section;
}

function viewIndicaciones() {
  const area = el("textarea", {
    id: "indicaciones",
    maxlength: "800",
    placeholder: "",
  });
  area.value = draft.indicacionesGenerales;
  area.addEventListener("input", () => {
    draft.indicacionesGenerales = cleanMultiline(area.value, 800);
    saveDraft();
  });
  return el("section", { class: "screen stack" }, [
    el("button", { type: "button", class: "add-btn", onclick: () => completarIndicaciones(area) }, ["Completar"]),
    field("Control", "proximo-control", draft.proximoControl, "date", "", (input) => {
      draft.proximoControl = /^\d{4}-\d{2}-\d{2}$/.test(input.value) ? input.value : "";
      saveDraft();
    }),
    el("label", { class: "field", text: "Indicaciones" }, [area]),
  ]);
}

function viewRevision() {
  const sexo = draft.pacienteSexo === "M" ? "Masculino" : draft.pacienteSexo === "F" ? "Femenino" : "No indicado";
  return el("section", { class: "screen stack" }, [
    errorSlot(),
    reviewBlock("Médico", "perfil", [
      perfil.nombre || "—",
      perfil.cmp ? `CMP ${perfil.cmp}` : "—",
    ]),
    reviewBlock("Paciente", "paciente", [
      draft.pacienteDNI ? `HC: ${draft.pacienteDNI}` : "HC —",
      draft.pacienteNombre || "—",
      `Edad ${draft.pacienteEdad || "—"} · ${sexo}`,
      `${draft.fechaAtencion || "—"}${draft.horaAtencion ? ` · ${draft.horaAtencion}` : ""}`,
    ]),
    reviewBlock("Diagnóstico", "diagnostico", [
      [draft.cie10, draft.diagnostico].filter(Boolean).join(" — ") || "—",
      draft.proximoControl ? `Control ${draft.proximoControl}` : "",
    ].filter(Boolean)),
    reviewBlock("Medicamentos", "medicamentos", draft.medicamentos.length
      ? draft.medicamentos.map((med) => `${med.nombre} — ${med.cantidad}, ${med.frecuencia}`)
      : ["—"]),
    reviewBlock("Exámenes", "examenes", draft.examenes.length
      ? draft.examenes.map((ex) => ex.nombre)
      : ["—"]),
    reviewBlock("Indicaciones", "indicaciones", [draft.indicacionesGenerales || "—"]),
  ]);
}

function viewListo() {
  return el("section", { class: "screen stack home" }, [
    el("div", { class: "success-mark", text: "✓" }),
    el("button", { type: "button", class: "cta", onclick: startNew }, [
      el("span", { class: "cta-title", text: "Nueva receta" }),
    ]),
    el("button", { type: "button", class: "secondary-card", onclick: () => goto("inicio") }, [
      el("div", { class: "profile-name", text: "Inicio" }),
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

function medInput(label, id, key, placeholder) {
  const input = el("input", {
    id,
    type: "text",
    value: medForm[key],
    placeholder,
    maxlength: "120",
    autocomplete: "off",
  });
  input.addEventListener("input", () => {
    const max = key === "indicaciones" ? 240 : key === "nombre" ? 120 : 80;
    medForm[key] = cleanText(input.value, max);
    if (key === "presentacion") syncCantidad();
  });
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
      el("button", { type: "button", class: "text-danger", onclick: () => {
        draft.medicamentos = draft.medicamentos.filter((item) => item.id !== med.id);
        saveDraft();
        goto("medicamentos");
      } }, ["Quitar"]),
    ]),
    el("p", { text: `${med.presentacion} · ${med.cantidad}` }),
    el("p", { class: "muted", text: `${med.dosis}, ${med.frecuencia}, ${med.duracion}, ${med.via}` }),
    med.indicaciones ? el("p", { class: "muted", text: med.indicaciones }) : null,
  ]);
}

function examCard(ex) {
  return el("article", { class: "item" }, [
    el("div", { class: "item-top" }, [
      el("h3", { text: ex.nombre }),
      el("button", { type: "button", class: "text-danger", onclick: () => {
        draft.examenes = draft.examenes.filter((item) => item.id !== ex.id);
        saveDraft();
        goto("examenes");
      } }, ["Quitar"]),
    ]),
  ]);
}

function reviewBlock(title, stepId, lines) {
  return el("section", { class: "review" }, [
    el("div", { class: "review-top" }, [
      el("h2", { text: title }),
      el("button", { type: "button", class: "link", onclick: () => {
        if (stepId === "perfil") openPerfil("revision");
        else goto(stepId);
      } }, ["Editar"]),
    ]),
    ...lines.map((line) => el("p", { text: line })),
  ]);
}

function subtiposVisibles() {
  return [...new Set(cie10Data.filter((dx) => (
    (!draft.filtroSistema || dx.sistema === draft.filtroSistema)
    && (!draft.filtroTipo || dx.tipo === draft.filtroTipo)
  )).map((dx) => dx.subtipo).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
}

function paintDxSuggestions() {
  const box = document.getElementById("dx-suggest");
  if (!box) return;
  const term = (draft.dxQuery || "").trim().toLowerCase();
  const filtrado = Boolean(draft.filtroSistema || draft.filtroTipo || draft.filtroSubtipo);
  if (term.length < 2 && !filtrado) {
    box.replaceChildren();
    return;
  }
  const matches = cie10Data.filter((dx) => {
    const text = term.length < 2 || [dx.codigo, dx.descripcion, dx.grupo, dx.subtipo, etiquetaTipo(dx.tipo)].some((value) => String(value || "").toLowerCase().includes(term));
    const sistema = !draft.filtroSistema || dx.sistema === draft.filtroSistema;
    const tipo = !draft.filtroTipo || dx.tipo === draft.filtroTipo;
    const subtipo = !draft.filtroSubtipo || dx.subtipo === draft.filtroSubtipo;
    return text && sistema && tipo && subtipo;
  }).slice(0, 2);
  box.replaceChildren(...matches.map((dx) => {
    const curso = etiquetaTipo(dx.tipo);
    const button = el("button", { type: "button", class: "suggestion" }, [
      el("strong", { text: `${dx.codigo} — ${dx.descripcion}` }),
      el("small", { text: [curso, dx.subtipo, dx.severidad, dx.sistema].filter(Boolean).join(" · ") }),
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
  }));
}

function scoreMed(med, term) {
  const t = term.toLowerCase();
  const dci = med.dci.toLowerCase();
  const present = (med.presentacion || "").toLowerCase();
  const marcas = (med.marcas || []).map((marca) => marca.toLowerCase());
  const extra = [med.via, med.grupo, med.atc].map((value) => String(value || "").toLowerCase());
  if (dci.startsWith(t)) return 4;
  if (present.split(/\s+/).some((word) => word.startsWith(t))) return 3;
  if (dci.includes(t)) return 2;
  if (marcas.some((marca) => marca.includes(t)) || extra.some((value) => value.includes(t))) return 1;
  return -1;
}

function paintMedSuggestions() {
  const box = document.getElementById("med-suggest");
  if (!box) return;
  const term = medForm.q.trim().toLowerCase();
  if (term.length < 3) {
    box.replaceChildren();
    return;
  }
  const grupos = new Map();
  for (const med of medicamentosData) {
    const score = scoreMed(med, term);
    if (score < 0) continue;
    const actual = grupos.get(med.dci);
    if (!actual || score > actual.score) grupos.set(med.dci, { score, med });
  }
  const matches = [...grupos.values()]
    .sort((a, b) => b.score - a.score || a.med.dci.localeCompare(b.med.dci, "es"))
    .slice(0, 2)
    .map((item) => item.med);
  box.replaceChildren(...matches.map((med) => {
    const total = presentacionesDe(med.dci).length;
    const peru = (med.marcas || []).filter((marca) => MARCAS_PERU.some((item) => item.toLowerCase() === marca.toLowerCase()));
    const button = el("button", { type: "button", class: "suggestion" }, [
      el("strong", { text: `${med.dci} — ${med.presentacion}` }),
      el("small", { text: [total > 1 ? `${total} presentaciones` : "", med.via, dosisReferencia(med)].filter(Boolean).join(" · ") }),
      peru.length ? el("small", { text: `Perú: ${peru.join(", ")}` }) : null,
    ]);
    button.addEventListener("click", () => applyMed(med));
    return button;
  }));
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

function paintExamSuggestions() {
  const box = document.getElementById("exam-suggest");
  if (!box) return;
  const term = examQuery.trim().toLowerCase();
  if (term.length < 3 && !draft.filtroExamen) {
    box.replaceChildren();
    return;
  }
  const matches = examenesCatalogo.filter((ex) => {
    const text = !term || [ex.nombre, ex.alias, ex.grupo].some((value) => String(value || "").toLowerCase().includes(term));
    const tipo = !draft.filtroExamen || ex.tipo === draft.filtroExamen;
    return text && tipo;
  }).slice(0, 2);
  box.replaceChildren(...matches.map((ex) => {
    const button = el("button", { type: "button", class: "suggestion" }, [
      el("strong", { text: ex.nombre }),
      el("small", { text: [ex.tipo, ex.grupo, ex.alias && ex.alias !== ex.nombre ? ex.alias : ""].filter(Boolean).join(" · ") }),
    ]);
    button.addEventListener("click", () => {
      examNombre = cleanText(ex.nombre, 160);
      examQuery = examNombre;
      const nombre = document.getElementById("exam-nombre");
      const query = document.getElementById("exam-q");
      if (nombre) nombre.value = examNombre;
      if (query) query.value = examQuery;
      box.replaceChildren();
    });
    return button;
  }));
}

function openComposer(kind) {
  showError("");
  if (kind === "med") {
    medForm = emptyMedForm();
    detalleMed = false;
  }
  if (kind === "exam") {
    examQuery = "";
    examNombre = "";
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
    id: Date.now(),
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
  draft.medicamentos.push(med);
  composer = null;
  saveDraft();
  goto("medicamentos");
}

function commitExam() {
  const nombre = cleanText(examNombre, 160);
  if (!nombre) {
    showError("Escribe el nombre del examen.");
    return;
  }
  draft.examenes.push({ id: Date.now(), nombre });
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
  if (screen === "examenes" && !draft.indicacionesGenerales.trim()) {
    draft.indicacionesGenerales = indicacionesAutomaticas(draft);
  }
  const index = wizardIndex();
  if (index < 0 || index >= WIZARD.length - 1) return;
  goto(WIZARD[index + 1].id);
}

function savePerfilFromForm() {
  const nextPerfil = {
    nombre: cleanText(document.getElementById("p-nombre").value, 120),
    cmp: cleanText(document.getElementById("p-cmp").value, 20),
    especialidad: cleanText(document.getElementById("p-esp").value, 80),
    telefono: cleanText(document.getElementById("p-tel").value, 20),
    email: cleanText(document.getElementById("p-mail").value, 120),
  };
  const email = validarEmail(nextPerfil.email);
  if (email) {
    showError(email);
    return;
  }
  perfil = nextPerfil;
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
  if (id === "examenes") return draft.examenes.length ? String(draft.examenes.length) : "Ninguno";
  return draft.indicacionesGenerales ? "Listas" : "Vacías";
}

function cuerpoPaso(id) {
  if (id === "paciente") return viewPaciente();
  if (id === "diagnostico") return viewDiagnostico();
  if (id === "medicamentos") return composer === "med" ? viewMedComposer() : viewMedicamentos();
  if (id === "examenes") return composer === "exam" ? viewExamComposer() : viewExamenes();
  return viewIndicaciones();
}

function abrirPanel(id) {
  if (panel === "paciente" && id !== "paciente") rememberPaciente();
  const estaba = screen === "receta" && panel === "paciente";
  if (panel !== id) {
    filtrosAbiertos = false;
    if (id !== "medicamentos") detalleMed = false;
    if (id !== "medicamentos" && id !== "examenes") composer = null;
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
    fold("examenes", "Exámenes"),
    fold("indicaciones", "Indicaciones"),
  ]);
}

function goto(id) {
  formError = "";
  if (WIZARD.some((step) => step.id === id)) {
    if (id !== "medicamentos" && id !== "examenes") composer = null;
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
  composer = null;
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
    ...draft.examenes.map((ex) => `Examen: ${ex.nombre}`),
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
  doc.line(x + 124, pie - 6, x + 186, pie - 6);
  doc.setFont("times", "bold");
  doc.text("Firma y Sello", x + 155, pie, { align: "center" });
  doc.setDrawColor(...tinta);
  doc.setLineWidth(0.45);
  doc.roundedRect(x, top, ancho, alto, 2.4, 2.4);
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
  if (!draft.medicamentos.length && !draft.examenes.length) {
    showError("Agrega al menos un medicamento o un examen.");
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
  render();
  const guardada = await cuentaGuardada();
  if (!guardada) return;
  cuenta = guardada;
  screen = "inicio";
  render();
}

boot();
