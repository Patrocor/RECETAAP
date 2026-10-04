/**
 * Módulo de Tratamientos Frecuentes, Packs de Exámenes, Diagnósticos Rápidos
 * y Presets Pediátricos para RecetAPP.
 */

export const TX_FRECUENTES_KEY = "recetapp.tx_frecuentes";
export const EXAM_PACKS_KEY = "recetapp.exam_packs";

/** Catálogo predeterminado de tratamientos frecuentes en consulta ambulatoria */
export const PRESETS_TRATAMIENTOS = [
  {
    id: "preset-faringoamigdalitis",
    nombre: "Faringoamigdalitis aguda bacteriana",
    categoria: "Respiratorio / Infeccioso",
    cie10: "J03.9",
    diagnostico: "Amigdalitis aguda, no especificada",
    medicamentos: [
      {
        nombre: "Amoxicilina",
        presentacion: "500 mg cápsula",
        via: "Vía oral",
        dosis: "500 mg",
        frecuencia: "Cada 8 horas",
        duracion: "7 días",
        cantidad: "21 cápsulas",
        indicaciones: "Tomar con o sin alimentos, completar los 7 días de tratamiento continuo.",
      },
      {
        nombre: "Ibuprofeno",
        presentacion: "400 mg tableta",
        via: "Vía oral",
        dosis: "400 mg",
        frecuencia: "Cada 8 horas",
        duracion: "3 días",
        cantidad: "9 tabletas",
        indicaciones: "Tomar después de los alimentos en caso de dolor faríngeo o fiebre.",
      },
    ],
    indicacionesGenerales: "Abundante hidratación oral, reposo relativo. Si presenta fiebre persistente tras 48h o dificultad respiratoria, acudir por urgencias.",
  },
  {
    id: "preset-itu-baja",
    nombre: "Infección urinaria baja (ITU no complicada)",
    categoria: "Urología / Infeccioso",
    cie10: "N39.0",
    diagnostico: "Infección de vías urinarias, sitio no especificado",
    medicamentos: [
      {
        nombre: "Nitrofurantoína",
        presentacion: "100 mg cápsula",
        via: "Vía oral",
        dosis: "100 mg",
        frecuencia: "Cada 8 horas",
        duracion: "7 días",
        cantidad: "21 cápsulas",
        indicaciones: "Tomar con las comidas o leche para mejorar la tolerancia gástrica.",
      },
      {
        nombre: "Fenazopiridina",
        presentacion: "100 mg tableta",
        via: "Vía oral",
        dosis: "100 mg",
        frecuencia: "Cada 8 horas",
        duracion: "2 días",
        cantidad: "6 tabletas",
        indicaciones: "Tomar con alimentos. Advertencia: puede teñir la orina de color anaranjado o rojizo.",
      },
    ],
    indicacionesGenerales: "Consumir al menos 2 a 2.5 litros de agua al día. No retener la orina y miccionar periódicamente.",
  },
  {
    id: "preset-lumbalgia",
    nombre: "Lumbalgia aguda / Dolor osteomuscular",
    categoria: "Osteomuscular / Traumatología",
    cie10: "M54.5",
    diagnostico: "Lumbago no especificado",
    medicamentos: [
      {
        nombre: "Paracetamol",
        presentacion: "500 mg tableta",
        via: "Vía oral",
        dosis: "500 mg",
        frecuencia: "Cada 8 horas",
        duracion: "5 días",
        cantidad: "15 tabletas",
        indicaciones: "Tomar con medio vaso de agua. No exceder 3 g al día.",
      },
      {
        nombre: "Naproxeno",
        presentacion: "500 mg tableta",
        via: "Vía oral",
        dosis: "500 mg",
        frecuencia: "Cada 12 horas",
        duracion: "5 días",
        cantidad: "10 tabletas",
        indicaciones: "Tomar estrictamente con alimentos o con protector gástrico.",
      },
    ],
    indicacionesGenerales: "Reposo relativo en cama solo 24-48 horas, aplicar calor local seco en zona lumbar 15 min 2 veces al día. Evitar cargar peso.",
  },
  {
    id: "preset-gastritis",
    nombre: "Gastritis aguda / Síndrome dispéptico",
    categoria: "Gastroenterología",
    cie10: "K29.7",
    diagnostico: "Gastritis, no especificada",
    medicamentos: [
      {
        nombre: "Omeprazol",
        presentacion: "20 mg cápsula",
        via: "Vía oral",
        dosis: "20 mg",
        frecuencia: "Cada 24 horas",
        duracion: "14 días",
        cantidad: "14 cápsulas",
        indicaciones: "Tomar 1 cápsula en ayunas 30 minutos antes del desayuno.",
      },
    ],
    indicacionesGenerales: "Dieta blanda y fraccionada. Evitar condimentos, café, bebidas alcohólicas, cítricos y analgésicos irritantes.",
  },
  {
    id: "preset-asma-crisis",
    nombre: "Crisis bronquial / Asma bronquial",
    categoria: "Neumología / Respiratorio",
    cie10: "J45.9",
    diagnostico: "Asma, no especificada",
    medicamentos: [
      {
        nombre: "Salbutamol",
        presentacion: "100 mcg aerosol",
        via: "Inhalatoria",
        dosis: "2 puff",
        frecuencia: "Cada 6 horas",
        duracion: "5 días",
        cantidad: "1 unidad",
        indicaciones: "Inhalar mediante aerocámara espaciadora. Enjuagarse la boca con agua tras su uso.",
      },
    ],
    indicacionesGenerales: "Evitar exposición al frío, polvo y humo de tabaco. Acudir de inmediato a emergencia si hay silbido intenso en el pecho o falta de aire.",
  },
];

/** Catálogo predeterminado de packs de exámenes */
export const PRESETS_EXAM_PACKS = [
  {
    id: "pack-preoperatorio",
    nombre: "Riesgo Quirúrgico / Preoperatorio",
    descripcion: "Perfil analítico y cardiológico prequirúrgico",
    examenes: [
      { nombre: "Hemograma completo", tipo: "Laboratorio", indicaciones: "Ayuno de 8 a 12 horas" },
      { nombre: "Glucosa en sangre", tipo: "Laboratorio", indicaciones: "Ayuno de 8 a 12 horas" },
      { nombre: "Urea", tipo: "Laboratorio", indicaciones: "Ayuno de 8 a 12 horas" },
      { nombre: "Creatinina", tipo: "Laboratorio", indicaciones: "Ayuno de 8 a 12 horas" },
      { nombre: "Tiempo de coagulación y tiempo de sangría", tipo: "Laboratorio", indicaciones: "En ayunas" },
      { nombre: "Grupo sanguíneo y factor Rh", tipo: "Laboratorio", indicaciones: "No requiere ayuno" },
      { nombre: "Electrocardiograma (EKG)", tipo: "Imágenes y otros", indicaciones: "Reposo 10 minutos previo, retirar objetos metálicos" },
      { nombre: "Radiografía de tórax", tipo: "Imágenes y otros", indicaciones: "Retirar cadenas, aretes y objetos de metal" },
    ],
  },
  {
    id: "pack-metabolico",
    nombre: "Chequeo Metabólico General",
    descripcion: "Evaluación cardiovascular, renal y glicémica",
    examenes: [
      { nombre: "Hemograma completo", tipo: "Laboratorio", indicaciones: "Ayuno de 8 a 12 horas" },
      { nombre: "Glucosa en sangre", tipo: "Laboratorio", indicaciones: "Ayuno estricto de 8 a 12 horas" },
      { nombre: "Colesterol total", tipo: "Laboratorio", indicaciones: "Ayuno de 12 horas, cena ligera la noche anterior" },
      { nombre: "Colesterol HDL", tipo: "Laboratorio", indicaciones: "Ayuno de 12 horas" },
      { nombre: "Colesterol LDL", tipo: "Laboratorio", indicaciones: "Ayuno de 12 horas" },
      { nombre: "Triglicéridos", tipo: "Laboratorio", indicaciones: "Ayuno de 12 horas, evitar alcohol 48h antes" },
      { nombre: "Ácido úrico", tipo: "Laboratorio", indicaciones: "Ayuno de 8 horas" },
      { nombre: "Examen completo de orina", tipo: "Laboratorio", indicaciones: "Primera orina de la mañana, chorro medio previo aseo" },
    ],
  },
  {
    id: "pack-itu",
    nombre: "Perfil Infección Urinaria (ITU)",
    descripcion: "Análisis y confirmación microbiológica urinaria",
    examenes: [
      { nombre: "Examen completo de orina", tipo: "Laboratorio", indicaciones: "Primera orina matutina, chorro medio con aseo genital previo" },
      { nombre: "Urocultivo con antibiograma", tipo: "Laboratorio", indicaciones: "Muestra recolectada antes de iniciar antibióticos" },
      { nombre: "Creatinina", tipo: "Laboratorio", indicaciones: "Ayuno de 8 horas" },
    ],
  },
  {
    id: "pack-prenatal",
    nombre: "Control Prenatal Básico (1er Trimestre)",
    descripcion: "Batería de despistaje y control gestacional",
    examenes: [
      { nombre: "Hemograma completo", tipo: "Laboratorio", indicaciones: "Ayuno de 8 horas" },
      { nombre: "Glucosa en sangre", tipo: "Laboratorio", indicaciones: "Ayuno de 8 a 12 horas" },
      { nombre: "Grupo sanguíneo y factor Rh", tipo: "Laboratorio", indicaciones: "No requiere ayuno" },
      { nombre: "Prueba rápida VIH", tipo: "Laboratorio", indicaciones: "Consentimiento informado firmado" },
      { nombre: "VDRL / RPR", tipo: "Laboratorio", indicaciones: "No requiere ayuno" },
      { nombre: "Examen completo de orina", tipo: "Laboratorio", indicaciones: "Chorro medio matutino" },
      { nombre: "Urocultivo con antibiograma", tipo: "Laboratorio", indicaciones: "Descarte de bacteriuria asintomática" },
      { nombre: "Ecografía obstétrica", tipo: "Imágenes y otros", indicaciones: "Vejiga moderadamente llena según semanas de gestación" },
    ],
  },
];

/** Diagnósticos CIE-10 Top rápidos para selección con un toque */
export const TOP_DIAGNOSTICOS = [
  { codigo: "J00", titulo: "Resfriado común", descripcion: "Rinofaringitis aguda [resfriado común]" },
  { codigo: "J03.9", titulo: "Amigdalitis aguda", descripcion: "Amigdalitis aguda, no especificada" },
  { codigo: "K29.7", titulo: "Gastritis", descripcion: "Gastritis, no especificada" },
  { codigo: "M54.5", titulo: "Lumbalgia", descripcion: "Lumbago no especificado" },
  { codigo: "N39.0", titulo: "Infección urinaria", descripcion: "Infección de vías urinarias, sitio no especificado" },
  { codigo: "I10", titulo: "Hipertensión (HTA)", descripcion: "Hipertensión esencial (primaria)" },
  { codigo: "E11.9", titulo: "Diabetes tipo 2", descripcion: "Diabetes mellitus tipo 2, sin mención de complicación" },
  { codigo: "B34.9", titulo: "Síndrome viral", descripcion: "Infección viral, no especificada" },
  { codigo: "J20.9", titulo: "Bronquitis aguda", descripcion: "Bronquitis aguda, no especificada" },
  { codigo: "A09", titulo: "Gastroenteritis aguda", descripcion: "Diarrea y gastroenteritis de presunto origen infeccioso" },
];

/** Presets pediátricos para la calculadora de dosis por peso */
export const PRESETS_PEDIATRICOS = [
  {
    id: "paracetamol-gotas",
    nombre: "Paracetamol gotas (100 mg / 1 mL)",
    farmaco: "Paracetamol",
    presentacion: "100 mg / 1 mL gotas",
    via: "Vía oral",
    mgKgDia: 45, // 15 mg/kg/toma cada 8h
    tomasDia: 3,
    frecuencia: "Cada 8 horas",
    duracion: "3 días",
    concMg: 100,
    concMl: 1,
    unidad: "gotas",
    indicacion: "Administrar en caso de fiebre > 38°C o dolor.",
  },
  {
    id: "paracetamol-jarabe",
    nombre: "Paracetamol jarabe (120 mg / 5 mL)",
    farmaco: "Paracetamol",
    presentacion: "120 mg / 5 mL jarabe",
    via: "Vía oral",
    mgKgDia: 45, // 15 mg/kg/toma cada 8h
    tomasDia: 3,
    frecuencia: "Cada 8 horas",
    duracion: "3 días",
    concMg: 120,
    concMl: 5,
    unidad: "mL",
    indicacion: "Tomar con vaso dosificador en caso de malestar o fiebre.",
  },
  {
    id: "ibuprofeno-susp",
    nombre: "Ibuprofeno suspensión (100 mg / 5 mL)",
    farmaco: "Ibuprofeno",
    presentacion: "100 mg / 5 mL suspensión",
    via: "Vía oral",
    mgKgDia: 30, // 10 mg/kg/toma cada 8h
    tomasDia: 3,
    frecuencia: "Cada 8 horas",
    duracion: "3 días",
    concMg: 100,
    concMl: 5,
    unidad: "mL",
    indicacion: "Tomar estrictamente con o después de los alimentos. No usar en deshidratación.",
  },
  {
    id: "ibuprofeno-forte",
    nombre: "Ibuprofeno suspensión forte (200 mg / 5 mL)",
    farmaco: "Ibuprofeno",
    presentacion: "200 mg / 5 mL suspensión",
    via: "Vía oral",
    mgKgDia: 30,
    tomasDia: 3,
    frecuencia: "Cada 8 horas",
    duracion: "3 días",
    concMg: 200,
    concMl: 5,
    unidad: "mL",
    indicacion: "Tomar después de los alimentos. Agitar el frasco antes de servir.",
  },
  {
    id: "amoxicilina-susp-250",
    nombre: "Amoxicilina suspensión (250 mg / 5 mL)",
    farmaco: "Amoxicilina",
    presentacion: "250 mg / 5 mL suspensión",
    via: "Vía oral",
    mgKgDia: 50, // 50 mg/kg/día
    tomasDia: 3,
    frecuencia: "Cada 8 horas",
    duracion: "7 días",
    concMg: 250,
    concMl: 5,
    unidad: "mL",
    indicacion: "Completar los 7 días de tratamiento continuo. Mantener refrigerado tras preparar.",
  },
  {
    id: "amoxicilina-forte-500",
    nombre: "Amoxicilina suspensión forte (500 mg / 5 mL)",
    farmaco: "Amoxicilina",
    presentacion: "500 mg / 5 mL suspensión",
    via: "Vía oral",
    mgKgDia: 80, // Dosis para otitis / respiratorio alto
    tomasDia: 3,
    frecuencia: "Cada 8 horas",
    duracion: "7 días",
    concMg: 500,
    concMl: 5,
    unidad: "mL",
    indicacion: "Completar el ciclo prescrito. Agitar bien antes de cada dosis.",
  },
  {
    id: "azitromicina-susp",
    nombre: "Azitromicina suspensión (200 mg / 5 mL)",
    farmaco: "Azitromicina",
    presentacion: "200 mg / 5 mL suspensión",
    via: "Vía oral",
    mgKgDia: 10, // 10 mg/kg/día dosis única
    tomasDia: 1,
    frecuencia: "Cada 24 horas",
    duracion: "3 días",
    concMg: 200,
    concMl: 5,
    unidad: "mL",
    indicacion: "Tomar una vez al día con el estómago vacío (1 hora antes o 2 horas después de comer).",
  },
];

/** Lee los tratamientos frecuentes del storage o retorna los presets */
export function obtenerTratamientosFrecuentes(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(TX_FRECUENTES_KEY);
    if (!raw) return [...PRESETS_TRATAMIENTOS];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [...PRESETS_TRATAMIENTOS];
  } catch {
    return [...PRESETS_TRATAMIENTOS];
  }
}

/** Guarda o actualiza un tratamiento en la lista del storage */
export function guardarTratamientoFrecuente(storage = globalThis.localStorage, nuevoTx) {
  if (!nuevoTx || typeof nuevoTx !== "object" || !nuevoTx.nombre) return null;
  const lista = obtenerTratamientosFrecuentes(storage);
  const id = nuevoTx.id || `tx-user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const elemento = {
    id,
    nombre: String(nuevoTx.nombre).trim().slice(0, 100),
    categoria: String(nuevoTx.categoria || "Personalizado").trim().slice(0, 60),
    cie10: String(nuevoTx.cie10 || "").trim().slice(0, 15),
    diagnostico: String(nuevoTx.diagnostico || "").trim().slice(0, 180),
    medicamentos: Array.isArray(nuevoTx.medicamentos) ? nuevoTx.medicamentos.map((m) => ({ ...m })) : [],
    indicacionesGenerales: String(nuevoTx.indicacionesGenerales || "").trim().slice(0, 800),
    esPersonalizado: true,
  };

  const idx = lista.findIndex((item) => item.id === id);
  if (idx >= 0) {
    lista[idx] = elemento;
  } else {
    lista.unshift(elemento);
  }

  try {
    storage?.setItem?.(TX_FRECUENTES_KEY, JSON.stringify(lista));
  } catch {}
  return elemento;
}

/** Elimina un tratamiento frecuente por ID */
export function eliminarTratamientoFrecuente(storage = globalThis.localStorage, id) {
  if (!id) return false;
  const lista = obtenerTratamientosFrecuentes(storage);
  const filtrada = lista.filter((item) => item.id !== id);
  try {
    storage?.setItem?.(TX_FRECUENTES_KEY, JSON.stringify(filtrada));
    return true;
  } catch {
    return false;
  }
}

/** Lee los packs de exámenes del storage o retorna los presets */
export function obtenerPacksExamenes(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(EXAM_PACKS_KEY);
    if (!raw) return [...PRESETS_EXAM_PACKS];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [...PRESETS_EXAM_PACKS];
  } catch {
    return [...PRESETS_EXAM_PACKS];
  }
}

/** Guarda un pack de exámenes en el storage */
export function guardarPackExamenes(storage = globalThis.localStorage, nuevoPack) {
  if (!nuevoPack || typeof nuevoPack !== "object" || !nuevoPack.nombre) return null;
  const lista = obtenerPacksExamenes(storage);
  const id = nuevoPack.id || `pack-user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const elemento = {
    id,
    nombre: String(nuevoPack.nombre).trim().slice(0, 100),
    descripcion: String(nuevoPack.descripcion || "Pack personalizado").trim().slice(0, 160),
    examenes: Array.isArray(nuevoPack.examenes) ? nuevoPack.examenes.map((e) => ({ ...e })) : [],
    esPersonalizado: true,
  };

  const idx = lista.findIndex((item) => item.id === id);
  if (idx >= 0) {
    lista[idx] = elemento;
  } else {
    lista.unshift(elemento);
  }

  try {
    storage?.setItem?.(EXAM_PACKS_KEY, JSON.stringify(lista));
  } catch {}
  return elemento;
}

/** Elimina un pack de exámenes por ID */
export function eliminarPackExamenes(storage = globalThis.localStorage, id) {
  if (!id) return false;
  const lista = obtenerPacksExamenes(storage);
  const filtrada = lista.filter((item) => item.id !== id);
  try {
    storage?.setItem?.(EXAM_PACKS_KEY, JSON.stringify(filtrada));
    return true;
  } catch {
    return false;
  }
}

/**
 * Aplica los medicamentos y diagnóstico de un tratamiento al borrador actual
 */
export function aplicarTratamientoADraft(draft, tratamiento, opciones = {}) {
  if (!draft || !tratamiento) return draft;
  const reemplazar = Boolean(opciones.reemplazar);
  const aplicarDx = opciones.aplicarDx !== false;

  const nuevosMeds = (tratamiento.medicamentos || []).map((m, idx) => ({
    ...m,
    id: `med-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
  }));

  if (reemplazar) {
    draft.medicamentos = nuevosMeds;
  } else {
    draft.medicamentos = [...(draft.medicamentos || []), ...nuevosMeds];
  }

  if (aplicarDx && tratamiento.diagnostico) {
    if (!draft.diagnostico || reemplazar) {
      draft.diagnostico = tratamiento.diagnostico;
      draft.cie10 = tratamiento.cie10 || "";
    }
  }

  if (tratamiento.indicacionesGenerales) {
    if (!draft.indicacionesGenerales) {
      draft.indicacionesGenerales = tratamiento.indicacionesGenerales;
    } else if (!draft.indicacionesGenerales.includes(tratamiento.indicacionesGenerales)) {
      draft.indicacionesGenerales = `${draft.indicacionesGenerales}\n${tratamiento.indicacionesGenerales}`.trim().slice(0, 800);
    }
  }

  return draft;
}

/**
 * Aplica los exámenes de un pack a la orden actual evitando duplicados exactos
 */
export function aplicarPackExamenesADraft(draft, pack) {
  if (!draft || !pack) return draft;
  const existentes = new Set(
    (draft.examenes || []).map((e) => `${String(e.nombre).toLowerCase()}|${String(e.tipo).toLowerCase()}`)
  );

  const agregados = [];
  (pack.examenes || []).forEach((ex, idx) => {
    const key = `${String(ex.nombre).toLowerCase()}|${String(ex.tipo).toLowerCase()}`;
    if (!existentes.has(key)) {
      existentes.add(key);
      agregados.push({
        id: `exam-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        nombre: ex.nombre,
        tipo: ex.tipo || "Laboratorio",
        indicaciones: ex.indicaciones || "",
      });
    }
  });

  draft.examenes = [...(draft.examenes || []), ...agregados];
  return draft;
}
