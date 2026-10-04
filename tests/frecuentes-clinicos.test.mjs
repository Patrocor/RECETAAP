import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
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
} from "../frecuentes.js";
import {
  calcularDosisPediatrica,
  fechaFinTratamiento,
  duracionMaximaTratamiento,
} from "../automatizar.js";

function crearMockStorage() {
  const store = new Map();
  return {
    getItem(k) {
      return store.has(k) ? store.get(k) : null;
    },
    setItem(k, v) {
      store.set(k, String(v));
    },
    removeItem(k) {
      store.delete(k);
    },
    clear() {
      store.clear();
    },
  };
}

test("catálogo predeterminado de tratamientos frecuentes tiene esquemas ambulatorios válidos", () => {
  assert.ok(Array.isArray(PRESETS_TRATAMIENTOS));
  assert.ok(PRESETS_TRATAMIENTOS.length >= 4);

  const faringo = PRESETS_TRATAMIENTOS.find((t) => t.id === "preset-faringoamigdalitis");
  assert.ok(faringo, "debe existir preset de faringoamigdalitis");
  assert.equal(faringo.cie10, "J03.9");
  assert.ok(faringo.medicamentos.some((m) => m.nombre === "Amoxicilina"));
  assert.ok(faringo.medicamentos.some((m) => m.nombre === "Ibuprofeno"));

  const itu = PRESETS_TRATAMIENTOS.find((t) => t.id === "preset-itu-baja");
  assert.ok(itu, "debe existir preset de ITU");
  assert.equal(itu.cie10, "N39.0");
  assert.ok(itu.medicamentos.some((m) => m.nombre === "Nitrofurantoína"));

  const lumbago = PRESETS_TRATAMIENTOS.find((t) => t.id === "preset-lumbalgia");
  assert.ok(lumbago, "debe existir preset de lumbalgia");
  assert.equal(lumbago.cie10, "M54.5");

  for (const tx of PRESETS_TRATAMIENTOS) {
    assert.ok(tx.id);
    assert.ok(tx.nombre);
    assert.ok(Array.isArray(tx.medicamentos) && tx.medicamentos.length > 0);
    for (const m of tx.medicamentos) {
      assert.ok(m.nombre);
      assert.ok(m.dosis);
      assert.ok(m.frecuencia);
      assert.ok(m.duracion);
      assert.ok(m.cantidad);
    }
  }
});

test("packs de exámenes predeterminados cubren perfiles de uso frecuente", () => {
  assert.ok(Array.isArray(PRESETS_EXAM_PACKS));
  assert.ok(PRESETS_EXAM_PACKS.length >= 4);

  const preop = PRESETS_EXAM_PACKS.find((p) => p.id === "pack-preoperatorio");
  assert.ok(preop, "debe incluir riesgo quirúrgico / preoperatorio");
  const nombresPreop = preop.examenes.map((e) => e.nombre);
  assert.ok(nombresPreop.includes("Hemograma completo"));
  assert.ok(nombresPreop.includes("Electrocardiograma (EKG)"));
  assert.ok(nombresPreop.includes("Grupo sanguíneo y factor Rh"));

  const metabolico = PRESETS_EXAM_PACKS.find((p) => p.id === "pack-metabolico");
  assert.ok(metabolico, "debe incluir chequeo metabólico");
  const nombresMet = metabolico.examenes.map((e) => e.nombre);
  assert.ok(nombresMet.includes("Glucosa en sangre"));
  assert.ok(nombresMet.includes("Perfil lipídico completo") || nombresMet.includes("Colesterol total"));

  const prenatal = PRESETS_EXAM_PACKS.find((p) => p.id === "pack-prenatal");
  assert.ok(prenatal, "debe incluir control prenatal básico");
});

test("top diagnósticos CIE-10 contiene los códigos de alta prevalencia", () => {
  assert.ok(Array.isArray(TOP_DIAGNOSTICOS));
  assert.ok(TOP_DIAGNOSTICOS.length >= 8);
  const codigos = TOP_DIAGNOSTICOS.map((d) => d.codigo);
  assert.ok(codigos.includes("J00"));
  assert.ok(codigos.includes("J03.9"));
  assert.ok(codigos.includes("K29.7"));
  assert.ok(codigos.includes("M54.5"));
  assert.ok(codigos.includes("N39.0"));
  assert.ok(codigos.includes("I10"));
  assert.ok(codigos.includes("E11.9"));
});

test("almacenamiento de tratamientos frecuentes permite guardar, leer y eliminar esquemas", () => {
  const mockStorage = crearMockStorage();

  const inicial = obtenerTratamientosFrecuentes(mockStorage);
  assert.equal(inicial.length, PRESETS_TRATAMIENTOS.length);

  const nuevoTx = {
    nombre: "Mi Esquema Antihipertensivo",
    categoria: "Cardiología",
    cie10: "I10",
    diagnostico: "Hipertensión esencial",
    medicamentos: [
      {
        nombre: "Amlodipino",
        presentacion: "5 mg tableta",
        via: "Vía oral",
        dosis: "5 mg",
        frecuencia: "Cada 24 horas",
        duracion: "30 días",
        cantidad: "30 tabletas",
      },
    ],
  };

  const guardado = guardarTratamientoFrecuente(mockStorage, nuevoTx);
  assert.ok(guardado.id);
  assert.equal(guardado.nombre, "Mi Esquema Antihipertensivo");
  assert.equal(guardado.esPersonalizado, true);

  const conNuevo = obtenerTratamientosFrecuentes(mockStorage);
  assert.equal(conNuevo.length, PRESETS_TRATAMIENTOS.length + 1);
  assert.equal(conNuevo[0].nombre, "Mi Esquema Antihipertensivo");

  const eliminado = eliminarTratamientoFrecuente(mockStorage, guardado.id);
  assert.equal(eliminado, true);
  const despuesEliminar = obtenerTratamientosFrecuentes(mockStorage);
  assert.equal(despuesEliminar.length, PRESETS_TRATAMIENTOS.length);
});

test("almacenamiento de packs de exámenes permite guardar y eliminar", () => {
  const mockStorage = crearMockStorage();

  const packsInicial = obtenerPacksExamenes(mockStorage);
  assert.equal(packsInicial.length, PRESETS_EXAM_PACKS.length);

  const nuevoPack = {
    nombre: "Perfil Tiroideo Básico",
    descripcion: "TSH y T4 libre",
    examenes: [
      { nombre: "TSH", tipo: "Laboratorio" },
      { nombre: "T4 Libre", tipo: "Laboratorio" },
    ],
  };

  const guardado = guardarPackExamenes(mockStorage, nuevoPack);
  assert.ok(guardado.id);
  assert.equal(guardado.esPersonalizado, true);

  const packsConNuevo = obtenerPacksExamenes(mockStorage);
  assert.equal(packsConNuevo.length, PRESETS_EXAM_PACKS.length + 1);

  eliminarPackExamenes(mockStorage, guardado.id);
  const packsFinal = obtenerPacksExamenes(mockStorage);
  assert.equal(packsFinal.length, PRESETS_EXAM_PACKS.length);
});

test("aplicarTratamientoADraft agrega medicamentos e inserta diagnóstico", () => {
  const draft = {
    pacienteNombre: "Juan Perez",
    diagnostico: "",
    cie10: "",
    medicamentos: [],
    indicacionesGenerales: "",
  };

  const faringo = PRESETS_TRATAMIENTOS.find((t) => t.id === "preset-faringoamigdalitis");
  aplicarTratamientoADraft(draft, faringo);

  assert.equal(draft.diagnostico, "Amigdalitis aguda, no especificada");
  assert.equal(draft.cie10, "J03.9");
  assert.equal(draft.medicamentos.length, 2);
  assert.ok(draft.medicamentos[0].id.startsWith("med-"));
  assert.ok(draft.medicamentos[1].id.startsWith("med-"));
  assert.notEqual(draft.medicamentos[0].id, draft.medicamentos[1].id);
  assert.ok(draft.indicacionesGenerales.includes("hidratación"));
});

test("aplicarPackExamenesADraft previene duplicados en la orden de exámenes", () => {
  const draft = {
    examenes: [
      { id: "e-1", nombre: "Hemograma completo", tipo: "Laboratorio" },
    ],
  };

  const pack = {
    examenes: [
      { nombre: "Hemograma completo", tipo: "Laboratorio" }, // Ya existe
      { nombre: "Glucosa en sangre", tipo: "Laboratorio" },  // Nuevo
      { nombre: "Creatinina", tipo: "Laboratorio" },         // Nuevo
    ],
  };

  aplicarPackExamenesADraft(draft, pack);

  assert.equal(draft.examenes.length, 3);
  const nombres = draft.examenes.map((e) => e.nombre);
  assert.equal(nombres.filter((n) => n === "Hemograma completo").length, 1);
  assert.ok(nombres.includes("Glucosa en sangre"));
  assert.ok(nombres.includes("Creatinina"));
});

test("calculadora pediátrica de dosis calcula mg por toma, volumen en mL y gotas exactas", () => {
  // Niño de 10 kg con Paracetamol gotas (100 mg / 1 mL), a 45 mg/kg/día en 3 tomas (15 mg/kg/toma):
  // Dosis total día: 450 mg. Dosis toma: 150 mg. mL toma: 1.5 mL. Gotas toma: 30 gotas.
  const rParacetamol = calcularDosisPediatrica(10, 45, 3, 100, 1);
  assert.ok(rParacetamol);
  assert.equal(rParacetamol.dosisTotalDiaMg, 450);
  assert.equal(rParacetamol.dosisTomaMg, 150);
  assert.equal(rParacetamol.mlPorToma, 1.5);
  assert.equal(rParacetamol.gotasPorToma, 30);
  assert.ok(rParacetamol.resumen.includes("1.5 mL (30 gotas)"));

  // Niño de 15 kg con Ibuprofeno suspensión (100 mg / 5 mL), a 30 mg/kg/día en 3 tomas (10 mg/kg/toma):
  // Dosis total día: 450 mg. Dosis toma: 150 mg. mL toma: (150 * 5) / 100 = 7.5 mL.
  const rIbuprofeno = calcularDosisPediatrica(15, 30, 3, 100, 5);
  assert.ok(rIbuprofeno);
  assert.equal(rIbuprofeno.dosisTotalDiaMg, 450);
  assert.equal(rIbuprofeno.dosisTomaMg, 150);
  assert.equal(rIbuprofeno.mlPorToma, 7.5);

  // Niño de 12 kg con Amoxicilina suspensión (250 mg / 5 mL), a 50 mg/kg/día en 3 tomas:
  // Dosis total: 600 mg. Dosis toma: 200 mg. mL toma: (200 * 5) / 250 = 4 mL.
  const rAmoxi = calcularDosisPediatrica(12, 50, 3, 250, 5);
  assert.ok(rAmoxi);
  assert.equal(rAmoxi.dosisTotalDiaMg, 600);
  assert.equal(rAmoxi.dosisTomaMg, 200);
  assert.equal(rAmoxi.mlPorToma, 4);

  // Parámetros inválidos retornan null
  assert.equal(calcularDosisPediatrica(0, 50, 3, 250, 5), null);
  assert.equal(calcularDosisPediatrica(10, -10, 3, 250, 5), null);
  assert.equal(calcularDosisPediatrica(10, 50, 0, 250, 5), null);
  assert.equal(calcularDosisPediatrica("abc", 50, 3, 250, 5), null);
});

test("duración máxima y fecha de término calculan la conclusión clínica del tratamiento", () => {
  const meds = [
    { nombre: "Amoxicilina", duracion: "7 días" },
    { nombre: "Ibuprofeno", duracion: "3 días" },
  ];

  const durMax = duracionMaximaTratamiento(meds);
  assert.equal(durMax, "7 días");

  const fechaInicio = "2026-10-04";
  const fin = fechaFinTratamiento(fechaInicio, durMax);
  assert.ok(fin.includes("11") && fin.includes("2026"));

  // Entradas sin duración retornan cadena vacía
  assert.equal(duracionMaximaTratamiento([]), "");
  assert.equal(fechaFinTratamiento("invalid-date", "7 días"), "");
});

test("código de app.js y styles.css integran la suite completa de herramientas clínicas", () => {
  const appJs = fs.readFileSync(path.resolve("app.js"), "utf8");
  const stylesCss = fs.readFileSync(path.resolve("styles.css"), "utf8");

  // Integraciones en app.js
  assert.match(appJs, /obtenerTratamientosFrecuentes/);
  assert.match(appJs, /obtenerPacksExamenes/);
  assert.match(appJs, /calcularDosisPediatrica/);
  assert.match(appJs, /modalTxFrecuentes/);
  assert.match(appJs, /modalCalcPediatrica/);
  assert.match(appJs, /modalPacksExamenes/);
  assert.match(appJs, /TOP_DIAGNOSTICOS/);
  assert.match(appJs, /duracionMaximaTratamiento/);
  assert.match(appJs, /fechaFinTratamiento/);

  // Estilos en styles.css
  assert.match(stylesCss, /\.med-toolbar/);
  assert.match(stylesCss, /\.btn-tool\.is-tx/);
  assert.match(stylesCss, /\.btn-tool\.is-calc/);
  assert.match(stylesCss, /\.dx-rapidos-section/);
  assert.match(stylesCss, /\.dx-quick-chip/);
  assert.match(stylesCss, /\.packs-quick-bar/);
  assert.match(stylesCss, /\.pack-quick-chip/);
  assert.match(stylesCss, /\.tx-fin-card/);
  assert.match(stylesCss, /\.modal-backdrop/);
  assert.match(stylesCss, /\.modal-window/);
  assert.match(stylesCss, /\.calc-result-box/);
});
