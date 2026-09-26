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
  { id: "síntoma", label: "Síntoma" },
  { id: "prevención", label: "Prevención" },
];

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
    dxQuery: "",
    filtroSistema: "",
    filtroTipo: "",
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
let cantidadManual = false;
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
    base.dxQuery = cleanText(raw.dxQuery, 80);
    base.filtroSistema = SISTEMAS.includes(raw.filtroSistema) ? raw.filtroSistema : "";
    base.filtroTipo = TIPOS.some((t) => t.id === raw.filtroTipo) ? raw.filtroTipo : "";
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
      saveDraft();
      paintDxSuggestions();
    });
    section.append(el("label", { class: "field", text: "Sistema" }, [sistema]));
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
          saveDraft();
          goto("diagnostico");
        } }, ["Quitar"]),
      ]),
      el("p", { text: draft.diagnostico }),
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

function viewMedComposer() {
  return el("section", { class: "screen stack" }, [
    (() => {
      const input = el("input", {
        id: "med-q",
        type: "search",
        value: medForm.q,
        placeholder: "",
        maxlength: "80",
        autocomplete: "off",
      });
      input.addEventListener("input", () => {
        medForm.q = cleanText(input.value, 80);
        paintMedSuggestions();
      });
      return el("label", { class: "field", text: "Buscar" }, [input]);
    })(),
    el("div", { id: "med-suggest", class: "suggestions" }),
    el("button", {
      type: "button",
      class: detalleMed ? "add-btn is-on" : "add-btn",
      onclick: () => {
        detalleMed = !detalleMed;
        goto("medicamentos");
      },
    }, ["Detalle"]),
    ...(detalleMed ? [
    medInput("Nombre", "med-nombre", "nombre", "Paracetamol"),
    el("div", { class: "two" }, [
      medInput("Presentación", "med-presentacion", "presentacion", "500 mg"),
      medInput("Cantidad", "med-cantidad", "cantidad", "20"),
    ]),
    el("div", { class: "two" }, [
      medInput("Dosis", "med-dosis", "dosis", "500 mg"),
      medInput("Duración", "med-duracion", "duracion", "7"),
    ]),
    el("div", { class: "two" }, [
      selectField("Frecuencia", "med-frecuencia", FRECUENCIAS, medForm.frecuencia, (value) => {
        medForm.frecuencia = value;
        syncCantidad();
      }),
      selectField("Vía", "med-via", VIAS, medForm.via, (value) => {
        medForm.via = value;
      }),
    ]),
    medInput("Indicaciones", "med-indicaciones", "indicaciones", "Con alimentos"),
    ] : []),
  ]);
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
      draft.pacienteDNI ? `HC ${draft.pacienteDNI}` : "HC —",
      draft.pacienteNombre || "—",
      `Edad ${draft.pacienteEdad || "—"} · ${sexo}`,
      `${draft.fechaAtencion || "—"}${draft.horaAtencion ? ` · ${draft.horaAtencion}` : ""}`,
    ]),
    reviewBlock("Diagnóstico", "diagnostico", [draft.diagnostico || "—"]),
    reviewBlock("Medicamentos", "medicamentos", draft.medicamentos.length
      ? draft.medicamentos.map((med) => `${med.nombre} — ${med.dosis}, ${med.frecuencia}`)
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
    if (key === "cantidad") cantidadManual = true;
    if (key === "duracion" || key === "presentacion") syncCantidad();
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

function paintDxSuggestions() {
  const box = document.getElementById("dx-suggest");
  if (!box) return;
  const term = (draft.dxQuery || "").trim().toLowerCase();
  const filtrado = Boolean(draft.filtroSistema || draft.filtroTipo);
  if (term.length < 2 && !filtrado) {
    box.replaceChildren();
    return;
  }
  const matches = cie10Data.filter((dx) => {
    const text = term.length < 2 || [dx.codigo, dx.descripcion, dx.grupo].some((value) => String(value || "").toLowerCase().includes(term));
    const sistema = !draft.filtroSistema || String(dx.sistema || "").toLowerCase().includes(draft.filtroSistema.toLowerCase());
    const tipo = !draft.filtroTipo || dx.tipo === draft.filtroTipo;
    return text && sistema && tipo;
  }).slice(0, 2);
  box.replaceChildren(...matches.map((dx) => {
    const button = el("button", { type: "button", class: "suggestion" }, [
      el("strong", { text: `${dx.codigo} — ${dx.descripcion}` }),
      el("small", { text: [dx.grupo, dx.sistema, dx.tipo].filter(Boolean).join(" · ") }),
    ]);
    button.addEventListener("click", () => {
      draft.diagnostico = cleanText(`${dx.codigo} - ${dx.descripcion}`, 180);
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
  const matches = medicamentosData
    .map((med) => ({ med, score: scoreMed(med, term) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score || a.med.dci.localeCompare(b.med.dci, "es"))
    .slice(0, 2)
    .map((item) => item.med);
  box.replaceChildren(...matches.map((med) => {
    const peru = (med.marcas || []).filter((marca) => MARCAS_PERU.some((item) => item.toLowerCase() === marca.toLowerCase()));
    const button = el("button", { type: "button", class: "suggestion" }, [
      el("strong", { text: `${med.dci} — ${med.presentacion}` }),
      el("small", { text: [med.grupo, med.via, dosisReferencia(med), med.atc ? `ATC ${med.atc}` : ""].filter(Boolean).join(" · ") }),
      peru.length ? el("small", { text: `Perú: ${peru.join(", ")}` }) : null,
    ]);
    button.addEventListener("click", () => applyMed(med));
    return button;
  }));
}

function applyMed(med) {
  medForm.nombre = cleanText(med.dci, 120);
  medForm.presentacion = cleanText(med.presentacion, 80);
  medForm.via = VIAS.find((via) => via === med.via) || "";
  medForm.dosis = dosisReferencia(med) || medForm.dosis;
  medForm.q = cleanText(`${med.dci} (${med.presentacion})`, 80);
  cantidadManual = false;
  const peru = (med.marcas || []).filter((marca) => MARCAS_PERU.some((item) => item.toLowerCase() === marca.toLowerCase()));
  const assign = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.value = value;
  };
  assign("med-q", medForm.q);
  assign("med-nombre", medForm.nombre);
  assign("med-presentacion", medForm.presentacion);
  assign("med-via", medForm.via);
  assign("med-dosis", medForm.dosis);
  const notas = document.getElementById("med-indicaciones");
  if (notas && peru.length) notas.placeholder = `Marcas: ${peru.join(", ")}`;
  syncCantidad();
  const box = document.getElementById("med-suggest");
  if (box) box.replaceChildren();
}

function syncCantidad() {
  if (cantidadManual) return;
  const cantidad = calcularCantidad(medForm.presentacion, medForm.frecuencia, medForm.duracion);
  if (!cantidad && !medForm.cantidad) return;
  medForm.cantidad = cantidad;
  const node = document.getElementById("med-cantidad");
  if (node) node.value = cantidad;
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
    cantidadManual = false;
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
  let duracion = cleanText(medForm.duracion, 40);
  if (duracion && /^\d+$/.test(duracion)) {
    const n = Number(duracion);
    duracion = n === 1 ? "1 día" : `${n} días`;
  }
  const med = sanitizeMed({
    id: Date.now(),
    nombre: medForm.nombre,
    presentacion: medForm.presentacion,
    cantidad: medForm.cantidad,
    dosis: medForm.dosis,
    frecuencia: medForm.frecuencia,
    duracion,
    via: medForm.via,
    indicaciones: medForm.indicaciones,
  });
  if (!med) {
    showError("Completa nombre, presentación, cantidad, dosis, frecuencia, duración y vía.");
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

function writeLine(doc, text, x, y, width) {
  const lines = doc.splitTextToSize(String(text || ""), width);
  doc.text(lines, x, y);
  return y + lines.length * 6;
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
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    const width = pageWidth - margin * 2;
    let y = 20;

    const ensure = (needed) => {
      if (y + needed > pageHeight - 16) {
        doc.addPage();
        y = 20;
      }
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("RECETA MÉDICA", pageWidth / 2, y, { align: "center" });
    y += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const contacto = [];
    if (perfil.telefono) contacto.push(`Tel: ${perfil.telefono}`);
    if (perfil.email && !validarEmail(perfil.email)) contacto.push(perfil.email);
    if (contacto.length) y = writeLine(doc, contacto.join(" | "), margin, y, width);
    y += 2;
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("MÉDICO PRESCRIPTOR", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    y = writeLine(doc, perfil.nombre, margin, y, width);
    const credencial = perfil.especialidad ? `CMP: ${perfil.cmp} | ${perfil.especialidad}` : `CMP: ${perfil.cmp}`;
    y = writeLine(doc, credencial, margin, y, width);
    y += 4;

    doc.setFont("helvetica", "bold");
    doc.text("PACIENTE", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    y = writeLine(doc, draft.pacienteNombre, margin, y, width);
    const sexo = draft.pacienteSexo === "M" ? "Masculino" : draft.pacienteSexo === "F" ? "Femenino" : "";
    let datos = `Edad: ${draft.pacienteEdad} años`;
    if (sexo) datos += ` | Sexo: ${sexo}`;
    if (draft.pacienteDNI) datos += ` | HC: ${draft.pacienteDNI}`;
    y = writeLine(doc, datos, margin, y, width);
    const fecha = new Date(`${draft.fechaAtencion}T00:00:00`).toLocaleDateString("es-PE", {
      year: "numeric", month: "long", day: "numeric",
    });
    y = writeLine(doc, `Fecha de atención: ${fecha}${draft.horaAtencion ? ` | Hora: ${draft.horaAtencion}` : ""}`, margin, y, width);
    if (draft.diagnostico) y = writeLine(doc, `Diagnóstico: ${draft.diagnostico}`, margin, y, width);
    y += 4;

    if (draft.medicamentos.length) {
      ensure(20);
      doc.setFont("helvetica", "bold");
      doc.text("Rp/", margin, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      draft.medicamentos.forEach((med, index) => {
        ensure(18);
        const texto = `${index + 1}. ${med.nombre} (${med.presentacion}) — Cant.: ${med.cantidad}. ${med.dosis}, ${med.frecuencia}, ${med.duracion}, ${med.via}${med.indicaciones ? `. ${med.indicaciones}` : ""}`;
        y = writeLine(doc, texto, margin, y, width);
        y += 2;
      });
    }

    if (draft.examenes.length) {
      ensure(20);
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.text("Exámenes auxiliares", margin, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      draft.examenes.forEach((ex, index) => {
        ensure(12);
        y = writeLine(doc, `${index + 1}. ${ex.nombre}`, margin, y, width);
      });
    }

    if (draft.indicacionesGenerales) {
      ensure(24);
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.text("Indicaciones generales", margin, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      y = writeLine(doc, draft.indicacionesGenerales, margin, y, width);
    }

    ensure(36);
    y += 12;
    doc.line(pageWidth / 2 - 28, y, pageWidth / 2 + 28, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Firma del médico", pageWidth / 2, y, { align: "center" });
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text(perfil.nombre, pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.text(credencial, pageWidth / 2, y, { align: "center" });
    y += 8;
    doc.setFontSize(8);
    doc.setTextColor(90);
    const generado = new Date().toLocaleString("es-PE", {
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });
    doc.text(`Generado localmente el ${generado}. Este PDF no incluye firma digital.`, pageWidth / 2, y, { align: "center" });
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
