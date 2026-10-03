import { readFileSync, writeFileSync } from "node:fs";
import { cie10Data } from "../catalogos.js";

const SISTEMA = {
  "Salud mental": "Salud Mental",
  "Músculo-esquelético": "Musculoesquelético",
  "Infeccioso": "Infecciosas",
  "Neoplasias": "Oncología",
  "Metabólico": "Endocrino/Metabólico",
  "Traumatología": "Traumatismos",
  "Síntomas generales": "Síntomas y Signos",
};

const COMPLEMENTO = [
  ["K25.4", "Úlcera gástrica crónica con hemorragia", "Digestivo"],
  ["K25.5", "Úlcera gástrica crónica con perforación", "Digestivo"],
  ["K25.6", "Úlcera gástrica crónica con hemorragia y perforación", "Digestivo"],
  ["K26.4", "Úlcera duodenal crónica con hemorragia", "Digestivo"],
  ["K26.5", "Úlcera duodenal crónica con perforación", "Digestivo"],
  ["K27.3", "Úlcera péptica aguda sin hemorragia ni perforación", "Digestivo"],
  ["K27.7", "Úlcera péptica crónica sin hemorragia ni perforación", "Digestivo"],
  ["K29.2", "Gastritis alcohólica", "Digestivo"],
  ["K29.5", "Gastritis crónica no especificada", "Digestivo"],
  ["K29.6", "Otras gastritis", "Digestivo"],
  ["K21.0", "Enfermedad por reflujo gastroesofágico con esofagitis", "Digestivo"],
  ["K21.9", "Enfermedad por reflujo gastroesofágico sin esofagitis", "Digestivo"],
  ["K52.9", "Gastroenteritis y colitis no infecciosa no especificada", "Digestivo"],
  ["K57.3", "Enfermedad diverticular del colon sin perforación ni absceso", "Digestivo"],
  ["K57.9", "Enfermedad diverticular intestinal sin perforación ni absceso", "Digestivo"],
  ["K58.0", "Síndrome de intestino irritable con diarrea", "Digestivo"],
  ["K58.9", "Síndrome de intestino irritable sin diarrea", "Digestivo"],
  ["K59.0", "Estreñimiento", "Digestivo"],
  ["K59.1", "Diarrea funcional", "Digestivo"],
  ["K80.4", "Cálculo de la vía biliar con colecistitis", "Digestivo"],
  ["K85.9", "Pancreatitis aguda no especificada", "Digestivo"],
  ["K86.1", "Otras pancreatitis crónicas", "Digestivo"],
  ["K35.8", "Otras apendicitis agudas y las no especificadas", "Digestivo"],
  ["J00", "Rinofaringitis aguda", "Respiratorio"],
  ["J06.8", "Otras infecciones agudas de las vías respiratorias superiores", "Respiratorio"],
  ["J06.9", "Infección aguda de vías respiratorias superiores no especificada", "Respiratorio"],
  ["J12.9", "Neumonía viral no especificada", "Respiratorio"],
  ["J15.9", "Neumonía bacteriana no especificada", "Respiratorio"],
  ["J18.0", "Bronconeumonía no especificada", "Respiratorio"],
  ["J18.1", "Neumonía lobar no especificada", "Respiratorio"],
  ["J18.9", "Neumonía no especificada", "Respiratorio"],
  ["J22", "Infección aguda no especificada de las vías respiratorias inferiores", "Respiratorio"],
  ["J30.0", "Rinitis vasomotora", "Respiratorio"],
  ["J30.1", "Rinitis alérgica debida al polen", "Respiratorio"],
  ["J30.3", "Otras rinitis alérgicas", "Respiratorio"],
  ["J30.4", "Rinitis alérgica no especificada", "Respiratorio"],
  ["J31.1", "Nasofaringitis crónica", "Respiratorio"],
  ["J32.2", "Sinusitis etmoidal crónica", "Respiratorio"],
  ["J32.3", "Sinusitis esfenoidal crónica", "Respiratorio"],
  ["J01.3", "Sinusitis esfenoidal aguda", "Respiratorio"],
  ["J01.4", "Pansinusitis aguda", "Respiratorio"],
  ["J41.8", "Bronquitis crónica mixta simple y mucopurulenta", "Respiratorio"],
  ["J40", "Bronquitis no especificada como aguda o crónica", "Respiratorio"],
  ["J44.8", "Otra enfermedad pulmonar obstructiva crónica", "Respiratorio"],
  ["N30.2", "Otras cistitis crónicas", "Genitourinario"],
  ["N30.3", "Trigonitis", "Genitourinario"],
  ["N30.4", "Cistitis por irradiación", "Genitourinario"],
  ["N39.0", "Infección de vías urinarias, sitio no especificado", "Genitourinario"],
  ["N20.0", "Cálculo del riñón", "Genitourinario"],
  ["N20.1", "Cálculo del uréter", "Genitourinario"],
  ["N20.9", "Cálculo urinario no especificado", "Genitourinario"],
  ["N40", "Hiperplasia de la próstata", "Genitourinario"],
  ["N41.0", "Prostatitis aguda", "Genitourinario"],
  ["N41.1", "Prostatitis crónica", "Genitourinario"],
  ["N18.1", "Enfermedad renal crónica, etapa 1", "Genitourinario"],
  ["N18.2", "Enfermedad renal crónica, etapa 2", "Genitourinario"],
  ["N18.3", "Enfermedad renal crónica, etapa 3", "Genitourinario"],
  ["N18.4", "Enfermedad renal crónica, etapa 4", "Genitourinario"],
  ["N18.5", "Enfermedad renal crónica, etapa 5", "Genitourinario"],
  ["N18.9", "Enfermedad renal crónica no especificada", "Genitourinario"],
  ["H10.2", "Otras conjuntivitis agudas", "Oftalmología"],
  ["H66.3", "Otras otitis medias supurativas crónicas", "Otorrinolaringología"],
  ["H65.4", "Otras otitis medias crónicas no supurativas", "Otorrinolaringología"],
  ["H60.5", "Otitis externa aguda no infecciosa", "Otorrinolaringología"],
  ["H61.2", "Tapón de cerumen", "Otorrinolaringología"],
  ["I11.0", "Enfermedad cardíaca hipertensiva con insuficiencia cardíaca", "Cardiovascular"],
  ["I11.9", "Enfermedad cardíaca hipertensiva sin insuficiencia cardíaca", "Cardiovascular"],
  ["I12.9", "Enfermedad renal hipertensiva sin insuficiencia renal", "Cardiovascular"],
  ["I25.8", "Otras formas de cardiopatía isquémica crónica", "Cardiovascular"],
  ["I47.1", "Taquicardia supraventricular", "Cardiovascular"],
  ["I49.9", "Arritmia cardíaca no especificada", "Cardiovascular"],
  ["I50.0", "Insuficiencia cardíaca congestiva", "Cardiovascular"],
  ["I50.1", "Insuficiencia ventricular izquierda", "Cardiovascular"],
  ["I50.9", "Insuficiencia cardíaca no especificada", "Cardiovascular"],
  ["I63.9", "Infarto cerebral no especificado", "Neurología"],
  ["I64", "Accidente vascular encefálico agudo no especificado", "Neurología"],
  ["I69.3", "Secuelas de infarto cerebral", "Neurología"],
  ["I69.4", "Secuelas de accidente vascular encefálico", "Neurología"],
  ["I70.9", "Aterosclerosis generalizada y la no especificada", "Cardiovascular"],
  ["I83.9", "Várices de miembros inferiores sin úlcera ni inflamación", "Cardiovascular"],
  ["E03.9", "Hipotiroidismo no especificado", "Endocrino/Metabólico"],
  ["E05.9", "Tirotoxicosis no especificada", "Endocrino/Metabólico"],
  ["E16.2", "Hipoglucemia no especificada", "Endocrino/Metabólico"],
  ["E66.9", "Obesidad no especificada", "Endocrino/Metabólico"],
  ["E78.1", "Hipertrigliceridemia pura", "Endocrino/Metabólico"],
  ["E78.2", "Hiperlipidemia mixta", "Endocrino/Metabólico"],
  ["E78.5", "Hiperlipidemia no especificada", "Endocrino/Metabólico"],
  ["E87.5", "Hiperkalemia", "Endocrino/Metabólico"],
  ["E87.6", "Hipokalemia", "Endocrino/Metabólico"],
  ["F41.0", "Trastorno de pánico", "Salud Mental"],
  ["F41.1", "Trastorno de ansiedad generalizada", "Salud Mental"],
  ["F41.2", "Trastorno mixto de ansiedad y depresión", "Salud Mental"],
  ["F43.0", "Reacción al estrés agudo", "Salud Mental"],
  ["F43.1", "Trastorno de estrés postraumático", "Salud Mental"],
  ["F51.0", "Insomnio no orgánico", "Salud Mental"],
  ["F33.4", "Trastorno depresivo recurrente, actualmente en remisión", "Salud Mental"],
  ["G43.0", "Migraña sin aura", "Neurología"],
  ["G43.1", "Migraña con aura", "Neurología"],
  ["G43.9", "Migraña no especificada", "Neurología"],
  ["G40.9", "Epilepsia no especificada", "Neurología"],
  ["G44.2", "Cefalea tensional", "Neurología"],
  ["G45.9", "Ataque isquémico transitorio no especificado", "Neurología"],
  ["G20", "Enfermedad de Parkinson", "Neurología"],
  ["G35", "Esclerosis múltiple", "Neurología"],
  ["G47.0", "Insomnio", "Neurología"],
  ["G56.0", "Síndrome del túnel carpiano", "Neurología"],
  ["G62.9", "Polineuropatía no especificada", "Neurología"],
  ["M54.2", "Cervicalgia", "Musculoesquelético"],
  ["M54.4", "Lumbago con ciática", "Musculoesquelético"],
  ["M54.5", "Lumbago", "Musculoesquelético"],
  ["M17.9", "Gonartrosis no especificada", "Musculoesquelético"],
  ["M16.9", "Coxartrosis no especificada", "Musculoesquelético"],
  ["M19.9", "Artrosis no especificada", "Musculoesquelético"],
  ["M06.9", "Artritis reumatoide no especificada", "Musculoesquelético"],
  ["M10.9", "Gota no especificada", "Musculoesquelético"],
  ["M25.5", "Dolor en articulación", "Musculoesquelético"],
  ["M51.1", "Trastorno de disco lumbar con radiculopatía", "Musculoesquelético"],
  ["M75.1", "Síndrome del manguito rotador", "Musculoesquelético"],
  ["M77.1", "Epicondilitis lateral", "Musculoesquelético"],
  ["M79.1", "Mialgia", "Musculoesquelético"],
  ["M79.7", "Fibromialgia", "Musculoesquelético"],
  ["M81.9", "Osteoporosis no especificada", "Musculoesquelético"],
  ["M32.9", "Lupus eritematoso sistémico no especificado", "Musculoesquelético"],
  ["L20.9", "Dermatitis atópica no especificada", "Dermatología"],
  ["L23.9", "Dermatitis alérgica de contacto, causa no especificada", "Dermatología"],
  ["L30.9", "Dermatitis no especificada", "Dermatología"],
  ["L40.0", "Psoriasis vulgar", "Dermatología"],
  ["L40.9", "Psoriasis no especificada", "Dermatología"],
  ["L50.0", "Urticaria alérgica", "Dermatología"],
  ["L50.1", "Urticaria idiopática crónica", "Dermatología"],
  ["L50.9", "Urticaria no especificada", "Dermatología"],
  ["L70.0", "Acné vulgar", "Dermatología"],
  ["L02.9", "Absceso cutáneo no especificado", "Dermatología"],
  ["L03.9", "Celulitis de sitio no especificado", "Dermatología"],
  ["L08.9", "Infección local de la piel no especificada", "Dermatología"],
  ["L98.4", "Úlcera crónica de la piel no clasificada en otra parte", "Dermatología"],
  ["A09", "Diarrea y gastroenteritis de presunto origen infeccioso", "Infecciosas"],
  ["A15.0", "Tuberculosis pulmonar confirmada por baciloscopia", "Infecciosas"],
  ["A16.2", "Tuberculosis pulmonar sin confirmación bacteriológica", "Infecciosas"],
  ["A54.9", "Infección gonocócica no especificada", "Infecciosas"],
  ["A90", "Dengue clásico", "Infecciosas"],
  ["A91", "Dengue hemorrágico", "Infecciosas"],
  ["B01.9", "Varicela sin complicación", "Pediatría"],
  ["B02.9", "Herpes zóster sin complicación", "Infecciosas"],
  ["B05.9", "Sarampión sin complicación", "Pediatría"],
  ["B08.2", "Exantema súbito", "Pediatría"],
  ["B08.4", "Estomatitis vesicular con exantema", "Pediatría"],
  ["B26.9", "Parotiditis sin complicación", "Pediatría"],
  ["B34.9", "Infección viral no especificada", "Infecciosas"],
  ["B35.1", "Tiña de las uñas", "Dermatología"],
  ["B35.3", "Tiña del pie", "Dermatología"],
  ["B35.4", "Tiña del cuerpo", "Dermatología"],
  ["B37.3", "Candidiasis de la vulva y de la vagina", "Ginecología"],
  ["B86", "Escabiosis", "Dermatología"],
  ["U07.1", "COVID-19, virus identificado", "Infecciosas"],
  ["J11.1", "Influenza con otras manifestaciones respiratorias, virus no identificado", "Respiratorio"],
  ["J10.1", "Influenza con otras manifestaciones respiratorias, virus identificado", "Respiratorio"],
  ["J05.0", "Laringitis obstructiva aguda", "Pediatría"],
  ["J05.1", "Epiglotitis aguda", "Pediatría"],
  ["J21.0", "Bronquiolitis aguda por virus sincitial respiratorio", "Pediatría"],
  ["J21.9", "Bronquiolitis aguda no especificada", "Pediatría"],
  ["L01.0", "Impétigo", "Pediatría"],
  ["L21.0", "Costra láctea", "Pediatría"],
  ["E40", "Kwashiorkor", "Pediatría"],
  ["E41", "Marasmo nutricional", "Pediatría"],
  ["E43", "Desnutrición proteicocalórica grave no especificada", "Pediatría"],
  ["E46", "Desnutrición proteicocalórica no especificada", "Pediatría"],
  ["E45", "Retardo del desarrollo por desnutrición", "Pediatría"],
  ["E55.0", "Raquitismo activo", "Pediatría"],
  ["P22.0", "Síndrome de dificultad respiratoria del recién nacido", "Perinatal"],
  ["P36.9", "Sepsis bacteriana del recién nacido no especificada", "Perinatal"],
  ["P59.9", "Ictericia neonatal no especificada", "Perinatal"],
  ["N70.1", "Salpingitis y ooforitis crónica", "Ginecología"],
  ["N76.4", "Absceso de la vulva", "Ginecología"],
  ["N80.0", "Endometriosis del útero", "Ginecología"],
  ["N80.1", "Endometriosis del ovario", "Ginecología"],
  ["N80.9", "Endometriosis no especificada", "Ginecología"],
  ["N83.0", "Quiste folicular del ovario", "Ginecología"],
  ["N84.0", "Pólipo del cuerpo del útero", "Ginecología"],
  ["N87.0", "Displasia cervical leve", "Ginecología"],
  ["N87.1", "Displasia cervical moderada", "Ginecología"],
  ["N87.9", "Displasia del cuello uterino no especificada", "Ginecología"],
  ["N91.2", "Amenorrea no especificada", "Ginecología"],
  ["N92.0", "Menstruación excesiva y frecuente con ciclo regular", "Ginecología"],
  ["N92.1", "Menstruación excesiva e irregular", "Ginecología"],
  ["N93.9", "Hemorragia vaginal anormal no especificada", "Ginecología"],
  ["N94.4", "Dismenorrea primaria", "Ginecología"],
  ["N94.5", "Dismenorrea secundaria", "Ginecología"],
  ["N94.6", "Dismenorrea no especificada", "Ginecología"],
  ["N95.1", "Estados menopáusicos y climatéricos", "Ginecología"],
  ["N97.9", "Infertilidad femenina no especificada", "Ginecología"],
  ["O20.0", "Amenaza de aborto", "Obstetricia"],
  ["O21.0", "Hiperémesis gravídica leve", "Obstetricia"],
  ["O21.1", "Hiperémesis gravídica con trastorno metabólico", "Obstetricia"],
  ["O80", "Parto único espontáneo", "Obstetricia"],
  ["Z32.1", "Embarazo confirmado", "Obstetricia"],
  ["C16.9", "Tumor maligno del estómago, parte no especificada", "Oncología"],
  ["C18.9", "Tumor maligno del colon, parte no especificada", "Oncología"],
  ["C20", "Tumor maligno del recto", "Oncología"],
  ["C22.0", "Carcinoma de células hepáticas", "Oncología"],
  ["C25.9", "Tumor maligno del páncreas, parte no especificada", "Oncología"],
  ["C53.9", "Tumor maligno del cuello del útero no especificado", "Oncología"],
  ["C56", "Tumor maligno del ovario", "Oncología"],
  ["C61", "Tumor maligno de la próstata", "Oncología"],
  ["C64", "Tumor maligno del riñón, excepto pelvis renal", "Oncología"],
  ["C67.9", "Tumor maligno de la vejiga, parte no especificada", "Oncología"],
  ["C73", "Tumor maligno de la glándula tiroides", "Oncología"],
  ["C85.9", "Linfoma no Hodgkin no especificado", "Oncología"],
  ["C91.9", "Leucemia linfoide no especificada", "Oncología"],
  ["D24", "Tumor benigno de la mama", "Oncología"],
  ["D25.9", "Leiomioma del útero no especificado", "Ginecología"],
  ["D50.9", "Anemia por deficiencia de hierro no especificada", "Hematología"],
  ["D51.9", "Anemia por deficiencia de vitamina B12 no especificada", "Hematología"],
  ["D52.9", "Anemia por deficiencia de folatos no especificada", "Hematología"],
  ["D62", "Anemia posthemorrágica aguda", "Hematología"],
  ["D64.9", "Anemia no especificada", "Hematología"],
  ["D69.6", "Trombocitopenia no especificada", "Hematología"],
  ["R05", "Tos", "Síntomas y Signos"],
  ["R10.1", "Dolor abdominal superior", "Síntomas y Signos"],
  ["R10.4", "Dolor abdominal no especificado", "Síntomas y Signos"],
  ["R11", "Náusea y vómito", "Síntomas y Signos"],
  ["R30.0", "Disuria", "Síntomas y Signos"],
  ["R42", "Mareo y desvanecimiento", "Síntomas y Signos"],
  ["R50.9", "Fiebre no especificada", "Síntomas y Signos"],
  ["R51", "Cefalea", "Síntomas y Signos"],
  ["R63.4", "Pérdida anormal de peso", "Síntomas y Signos"],
  ["T90.5", "Secuelas de traumatismo intracraneal", "Traumatismos"],
  ["T92.1", "Secuelas de fractura del brazo", "Traumatismos"],
  ["T93.2", "Secuelas de otras fracturas del miembro inferior", "Traumatismos"],
  ["Z00.2", "Examen durante el período de crecimiento rápido en la infancia", "Pediatría"],
  ["Z00.3", "Examen del estado de desarrollo del adolescente", "Pediatría"],
  ["Z01.0", "Examen de ojos y de la visión", "Prevención"],
  ["Z01.1", "Examen de oídos y de la audición", "Prevención"],
  ["Z01.4", "Examen ginecológico", "Ginecología"],
  ["Z09", "Examen de seguimiento consecutivo a tratamiento", "Prevención"],
  ["Z13.9", "Cribado no especificado", "Prevención"],
  ["Z48.0", "Atención de vendajes y suturas", "Procedimientos"],
  ["Z51.0", "Sesión de radioterapia", "Procedimientos"],
  ["Z51.5", "Cuidados paliativos", "Procedimientos"],
];

function sistemaDe(codigo, sistema) {
  let base = SISTEMA[sistema] || sistema;
  if (base === "Oftalmología/ORL") {
    base = /^H[6-9]/.test(codigo) || codigo.startsWith("J38") ? "Otorrinolaringología" : "Oftalmología";
  }
  if (/^N(7[0-7]|8[0-9]|9[0-8])/.test(codigo)) return "Ginecología";
  if (/^I6/.test(codigo)) return "Neurología";
  return base;
}

function familia(descripcion, sistema) {
  let texto = descripcion
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(agud[oa]s?|cr[oó]nic[oa]s?|recurrente[s]?|recidivante[s]?|no especificad[oa]s?|inicial|leves?|moderad[oa]s?|graves?|sever[oa]s?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(/[—,]/)[0]
    .trim();
  if (texto.length > 46) texto = texto.slice(0, 46).replace(/\s+\S*$/, "");
  return texto || sistema;
}

function severidadDe(descripcion) {
  const texto = descripcion.toLowerCase();
  if (/\bgraves?\b|\bsever[oa]s?\b/.test(texto)) return "grave";
  if (/\bmoderad[oa]s?\b/.test(texto)) return "moderado";
  if (/\bleves?\b/.test(texto)) return "leve";
  return "";
}

function subtipoDe(codigo, descripcion) {
  const texto = descripcion.toLowerCase();
  if (/bacter|estreptoc|estafiloc|gonococ|bacilo|\bcoli\b|sepsis|imp[eé]tigo/.test(texto)) return "bacteriano";
  if (/viral|virus|dengue|gripe|influenza|herpes|varicela|sarampi|parotid|covid|sincitial|hepatitis|\bvih\b/.test(texto)) return "viral";
  if (/tiña|candi|micosis|hongo/.test(texto)) return "micótico";
  if (/par[aá]sit|tricomon|escab|sarna/.test(texto)) return "parasitario";
  if (/al[eé]rg|at[oó]pic/.test(texto)) return "alérgico";
  if (/sin hemorr/.test(texto)) return "sin complicación";
  if (/hemorr|sangr/.test(texto)) return "hemorrágico";
  if (/obstruct/.test(texto)) return "obstructivo";
  if (/con complic/.test(texto)) return "con complicación";
  if (/sin complic/.test(texto)) return "sin complicación";
  const letra = codigo[0];
  if (letra === "A" || letra === "B" || codigo.startsWith("U07")) return "infeccioso";
  if (letra === "C" || /^D[0-4]/.test(codigo)) return "neoplásico";
  if (letra === "E") return "metabólico";
  if (letra === "F") return "mental";
  if (letra === "G") return "neurológico";
  if (letra === "I") return "vascular";
  if (/^H[0-5]/.test(codigo)) return "oftalmológico";
  if (/^H[6-9]/.test(codigo)) return "otológico";
  if (letra === "J") return "respiratorio";
  if (letra === "K") return "digestivo";
  if (letra === "L") return "dermatológico";
  if (letra === "M") return "musculoesquelético";
  if (letra === "N") return "genitourinario";
  if (letra === "O") return "obstétrico";
  if (letra === "P") return "perinatal";
  if (letra === "Q") return "congénito";
  if (letra === "R") return "síntoma";
  if (letra === "S" || letra === "T") return "traumático";
  if (letra === "Z") return "preventivo";
  return "no especificado";
}

function tipoDe(codigo, descripcion) {
  const texto = descripcion.toLowerCase();
  const agudo = /\bagud/.test(texto);
  const cronico = /cr[oó]nic|permanente|persistente/.test(texto);
  if (agudo && cronico) return "agudo sobre crónico";
  if (/\brecurrent|\brecidiv/.test(texto) || codigo.startsWith("F33") || codigo.startsWith("G43") || codigo.startsWith("G44.2")) return "recurrente";
  if (agudo || /xxa$/i.test(codigo)) return "agudo";
  if (cronico || codigo.startsWith("T9") || codigo.startsWith("I69")) return "crónico";
  if (codigo.startsWith("R")) return "síntoma";
  if (codigo.startsWith("Z")) return "prevención";
  if (codigo.startsWith("Q") || codigo.startsWith("P")) return "congénito";
  if (codigo.startsWith("S") || /^T(?!9)/.test(codigo)) return "traumático";
  if (codigo.startsWith("C") || /^D[0-4]/.test(codigo)) return "neoplásico";
  if (/^E1[0-4]/.test(codigo) && /cetoacidosis|coma|hipogl/.test(texto)) return "agudo sobre crónico";
  if (codigo.startsWith("J44.0") || codigo.startsWith("J44.1")) return "agudo sobre crónico";
  if (codigo.startsWith("J46") || /^J0/.test(codigo) || /^J1/.test(codigo) || /^J2[0-2]/.test(codigo)) return "agudo";
  if (codigo.startsWith("J3") || codigo.startsWith("J4")) return "crónico";
  if (codigo.startsWith("A") || codigo.startsWith("B") || codigo.startsWith("U07")) {
    if (codigo.startsWith("B18") || /^B2[0-4]/.test(codigo) || /^A1[5-9]/.test(codigo)) return "crónico";
    return "agudo";
  }
  if (codigo.startsWith("O")) return "agudo";
  if (codigo.startsWith("I21") || codigo.startsWith("I22") || codigo.startsWith("I24") || codigo.startsWith("I26") || codigo.startsWith("I46") || codigo.startsWith("I63") || codigo === "I64" || codigo.startsWith("I20.0")) return "agudo";
  if (codigo.startsWith("F32") || codigo.startsWith("F43.0")) return "agudo";
  if (/^L0/.test(codigo) || codigo.startsWith("L50.0") || codigo.startsWith("L50.9")) return "agudo";
  if (codigo.startsWith("M00") || codigo.startsWith("K35") || codigo.startsWith("K65") || codigo.startsWith("K81.0") || codigo.startsWith("K85") || codigo.startsWith("N10") || codigo.startsWith("N00") || codigo.startsWith("N30.0") || codigo.startsWith("N41.0") || codigo.startsWith("H10.0") || codigo.startsWith("H10.1") || codigo.startsWith("H10.2") || codigo.startsWith("H10.3") || codigo.startsWith("G00") || codigo.startsWith("G03") || codigo.startsWith("G04") || codigo.startsWith("G45")) return "agudo";
  if (codigo.startsWith("D62")) return "agudo";
  if (codigo.startsWith("U09")) return "crónico";
  if ("DEFGHIJKLMN".includes(codigo[0])) return "crónico";
  return "otro";
}

function enriquecer(dx) {
  const descripcion = String(dx.descripcion || "").replace(/\s+/g, " ").trim();
  const sistema = sistemaDe(dx.codigo, dx.sistema);
  return {
    codigo: dx.codigo,
    descripcion,
    grupo: familia(descripcion, sistema),
    sistema,
    tipo: tipoDe(dx.codigo, descripcion),
    subtipo: subtipoDe(dx.codigo, descripcion),
    severidad: severidadDe(descripcion),
  };
}

const vistos = new Set(cie10Data.map((dx) => dx.codigo));
const unidos = cie10Data.map(enriquecer);
let agregados = 0;
for (const [codigo, descripcion, sistema] of COMPLEMENTO) {
  if (vistos.has(codigo)) continue;
  vistos.add(codigo);
  unidos.push(enriquecer({ codigo, descripcion, sistema }));
  agregados += 1;
}
unidos.sort((a, b) => a.sistema.localeCompare(b.sistema, "es") || a.codigo.localeCompare(b.codigo, "es"));

const src = readFileSync(new URL("../catalogos.js", import.meta.url), "utf8");
const resto = src.slice(src.indexOf("export const medicamentosData"));
writeFileSync(new URL("../catalogos.js", import.meta.url), `export const cie10Data = ${JSON.stringify(unidos, null, 2)};\n\n${resto}`);

const porSistema = new Map();
const porTipo = new Map();
for (const dx of unidos) {
  porSistema.set(dx.sistema, (porSistema.get(dx.sistema) || 0) + 1);
  porTipo.set(dx.tipo, (porTipo.get(dx.tipo) || 0) + 1);
}
console.log("total", unidos.length, "agregados", agregados);
console.log("tipos", Object.fromEntries(porTipo));
console.log([...porSistema.entries()].sort((a, b) => a[0].localeCompare(b[0], "es")).map(([s, n]) => `${s} ${n}`).join("\n"));
