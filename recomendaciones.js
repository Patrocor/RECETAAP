function sinAcento(texto) {
  return String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export const recomendaciones = [
  { frase: "Tome con alimentos.", ruta: "oral", claves: ["ibuprofeno", "diclofenaco", "naproxeno", "ketorolaco", "ketoprofeno", "piroxicam", "meloxicam", "aspirina", "prednisona", "prednisolona", "dexametasona", "metformina", "hierro", "sulfato ferroso"] },
  { frase: "Tome en ayunas, media hora antes de comer.", ruta: "oral", claves: ["omeprazol", "pantoprazol", "esomeprazol", "lansoprazol", "rabeprazol", "levotiroxina", "alendronato"] },
  { frase: "Complete todos los días, aunque ya se sienta mejor.", claves: ["amoxicilina", "azitromicina", "cef", "ciprofloxacino", "levofloxacino", "clindamicina", "doxiciclina", "metronidazol", "claritromicina", "penicilina", "nitrofurantoina"] },
  { frase: "No lo combine con otro antiinflamatorio.", claves: ["ibuprofeno", "diclofenaco", "naproxeno", "ketorolaco", "ketoprofeno", "aspirina", "meloxicam", "piroxicam"] },
  { frase: "Evite el alcohol durante el tratamiento.", claves: ["metronidazol", "paracetamol", "ibuprofeno", "diclofenaco", "naproxeno", "metformina", "tramadol", "diazepam", "clonazepam", "lorazepam", "alprazolam"] },
  { frase: "Puede dar sueño: no maneje.", claves: ["clorfenamina", "hidroxicina", "difenhidramina", "dimenhidrinato", "clonazepam", "diazepam", "lorazepam", "alprazolam", "tramadol", "pregabalina", "gabapentina", "amitriptilina"] },
  { frase: "Tómelo cada día a la misma hora.", ruta: "oral", claves: ["losartan", "enalapril", "amlodipino", "atenolol", "bisoprolol", "carvedilol", "valsartan", "telmisartan", "captopril", "levotiroxina", "warfarina", "rivaroxaban", "apixaban"] },
  { frase: "No lo suspenda aunque la presión esté normal.", ruta: "oral", claves: ["losartan", "enalapril", "amlodipino", "atenolol", "bisoprolol", "carvedilol", "valsartan", "telmisartan", "captopril", "hidroclorotiazida"] },
  { frase: "Avise si hay sangrado o moretones extensos.", claves: ["warfarina", "rivaroxaban", "apixaban", "dabigatran", "enoxaparina", "heparina", "clopidogrel", "acido acetilsalicilico", "aspirina"] },
  { frase: "No tome aspirina ni antiinflamatorios sin consultarlo.", claves: ["warfarina", "rivaroxaban", "apixaban", "dabigatran", "enoxaparina", "clopidogrel"] },
  { frase: "Tome por la noche.", ruta: "oral", claves: ["atorvastatina", "simvastatina", "rosuvastatina"] },
  { frase: "Avise si aparece dolor muscular intenso.", claves: ["atorvastatina", "simvastatina", "rosuvastatina"] },
  { frase: "Tome con el desayuno o la cena.", ruta: "oral", claves: ["metformina"] },
  { frase: "Avise si hay vómitos o dolor abdominal intenso.", claves: ["metformina"] },
  { frase: "Tome lejos del té, el café y los lácteos.", ruta: "oral", claves: ["hierro", "sulfato ferroso", "levotiroxina", "ciprofloxacino", "levofloxacino"] },
  { frase: "Evite el sol fuerte mientras lo toma.", claves: ["doxiciclina", "ciprofloxacino", "levofloxacino", "isotretinoina"] },
  { frase: "No suspenda el corticoide de golpe.", claves: ["prednisona", "prednisolona", "dexametasona", "deflazacort", "betametasona", "hidrocortisona"] },
  { frase: "Tome el corticoide en la mañana, con alimentos.", ruta: "oral", claves: ["prednisona", "prednisolona", "dexametasona", "deflazacort"] },
  { frase: "Enjuague la boca después de cada inhalación.", ruta: "inhalador", claves: ["budesonida", "fluticasona", "beclometasona", "salmeterol"] },
  { frase: "Agite el inhalador antes de usarlo.", ruta: "inhalador", claves: ["*"] },
  { frase: "Use el inhalador de rescate solo si le falta el aire.", ruta: "inhalador", claves: ["salbutamol"] },
  { frase: "Aplique una capa delgada sobre la piel limpia y seca.", ruta: "topica", claves: ["*"] },
  { frase: "Lávese las manos. No toque el ojo con la punta del frasco.", ruta: "oftal", claves: ["*"] },
  { frase: "Rote el sitio en cada aplicación.", ruta: "subcut", claves: ["insulina", "enoxaparina", "heparina"] },
  { frase: "La inyección la aplica el personal de salud.", ruta: "inyect", claves: ["*"] },
  { frase: "Si hay ronchas, hinchazón o falta de aire, suspenda y acuda.", claves: ["*"] },
  { frase: "No comparta este medicamento.", claves: ["*"] },
  { frase: "Guárdelo fuera del alcance de los niños.", claves: ["*"] },
  { frase: "Acuda si la fiebre o el dolor no ceden en 48 horas.", claves: ["paracetamol", "ibuprofeno", "amoxicilina", "azitromicina", "diclofenaco"] },
  { frase: "Beba agua suficiente durante el tratamiento.", claves: ["*"] },
  { frase: "No lo use más días de los indicados.", claves: ["*"] },
];

function textoDe(med) {
  return sinAcento([med?.nombre, med?.presentacion, med?.via, med?.grupo, med?.dosis].filter(Boolean).join(" "));
}

function contieneClave(texto, clave) {
  const normal = sinAcento(clave);
  if (normal.length <= 4) return new RegExp(`(?:^|[^a-z0-9])${normal}`).test(texto);
  return texto.includes(normal);
}

function rutaDe(med) {
  const texto = textoDe(med);
  if (/(oftalm|colirio)/.test(texto)) return "oftal";
  if (/inhalador/.test(texto)) return "inhalador";
  if (/inhal/.test(texto)) return "inhal";
  if (/(subcut|insulina)/.test(texto)) return "subcut";
  if (/(?:^|[^a-z0-9])(?:topic|crema|pomada|gel)(?:[^a-z0-9]|$)|topica/.test(texto)) return "topica";
  if (/(intramuscular|intravenosa|ampolla|(?:^|[^a-z0-9])(?:im|iv)(?:[^a-z0-9]|$))/.test(texto)) return "inyect";
  return "oral";
}

function medCoincide(med, item) {
  const texto = textoDe(med);
  if (item.ruta && item.ruta !== rutaDe(med)) return false;
  if (item.claves.includes("*") && item.ruta) return true;
  return item.claves.some((clave) => clave !== "*" && contieneClave(texto, clave));
}

function coincide(frase, claves, termino) {
  const base = sinAcento(`${frase} ${claves.join(" ")}`);
  return termino.split(/[^a-z0-9]+/).filter((token) => token.length >= 2).every((token) => base.includes(token));
}

export function frasesRecomendadas(medicamentos = [], consulta = "") {
  const meds = medicamentos || [];
  const termino = sinAcento(consulta).trim();
  const ranked = [];
  for (const item of recomendaciones) {
    if (termino && !coincide(item.frase, item.claves, termino)) continue;
    const especifica = meds.some((med) => medCoincide(med, item));
    const general = item.claves.includes("*") && !item.ruta;
    if (!termino && !especifica && !general) continue;
    let score = especifica ? 10 : 2;
    if (general) score = Math.max(score, 1);
    if (termino && sinAcento(item.frase).startsWith(termino)) score += 6;
    ranked.push({ frase: item.frase, score });
  }
  ranked.sort((a, b) => b.score - a.score || a.frase.localeCompare(b.frase, "es"));
  const propias = ranked.filter((item) => item.score >= 10);
  const lista = !termino && propias.length ? propias : ranked;
  return lista.slice(0, 12).map((item) => item.frase);
}
