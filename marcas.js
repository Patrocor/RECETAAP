const SVG_NS = "http://www.w3.org/2000/svg";

const REGLAS = [
  [/reumat/, "reuma"],
  [/cardio/, "cardio"],
  [/neuro/, "neuro"],
  [/dermat/, "derma"],
  [/pediatr|neonat/, "pedia"],
  [/oftal|ocul/, "ojo"],
  [/neumo|pulmon|respirat/, "pulmo"],
  [/gastro|digest/, "gastro"],
  [/endocr|diabet|metabol/, "endo"],
  [/trauma|ortop/, "hueso"],
  [/ginec|obstet/, "gine"],
  [/psiq|psicolog|salud mental/, "mente"],
  [/nefrol|renal|urolog/, "renal"],
];

export function claveEspecialidad(texto) {
  const plano = String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  for (const [regla, clave] of REGLAS) {
    if (regla.test(plano)) return clave;
  }
  return "general";
}

function svg(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    node.setAttribute(key, String(value));
  }
  for (const child of [].concat(children)) {
    if (child) node.append(child);
  }
  return node;
}

function trazo(d, attrs = {}) {
  return svg("path", {
    d,
    fill: "none",
    stroke: "#123652",
    "stroke-width": "3",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    ...attrs,
  });
}

function lienzo(etiqueta, children) {
  return svg("svg", {
    class: "logo",
    viewBox: "0 0 171 136",
    role: "img",
    "aria-label": etiqueta,
  }, [
    svg("rect", { width: "171", height: "136", rx: "26", fill: "#D7E4F0" }),
    ...children,
  ]);
}

const MONOGRAMA = "M56.5078125 37.5625 45.1875 38.984375V103.296875H59.625Q71.2734375 103.296875 76.7421875 102.203125L80.1328125 86.9453125H83.6875L82.703125 108.0H25.2265625V105.1015625L34.6328125 103.625V38.984375L25.2265625 37.5625V34.6640625H56.5078125Z M105.6015625 75.84375V103.625L116.703125 105.1015625V108.0H86.3515625V105.1015625L95.046875 103.625V38.984375L85.640625 37.5625V34.6640625H117.3046875Q131.0859375 34.6640625 137.6484375 39.3125Q144.2109375 43.9609375 144.2109375 54.2421875Q144.2109375 61.5703125 140.21875 66.90234375Q136.2265625 72.234375 129.171875 74.3125L149.0234375 103.625L156.953125 105.1015625V108.0H139.3984375L118.78125 75.84375ZM133.328125 55.0078125Q133.328125 46.640625 129.25390625 43.11328125Q125.1796875 39.5859375 114.953125 39.5859375H105.6015625V70.921875H115.28125Q125.0703125 70.921875 129.19921875 67.28515625Q133.328125 63.6484375 133.328125 55.0078125Z";
const EKG = "M 4 71.33 H 112.73 l 5 -2.5 l 6 -28 l 7 46 l 6 -18 H 163.12 l 0 12";
const CORAZON = "M85.5 108 C85.5 108 46 80 46 58 C46 42 58 32 72 38 C80 42 85.5 52 85.5 52 C85.5 52 91 42 99 38 C113 32 125 42 125 58 C125 80 85.5 108 85.5 108 Z";

function pulso(d, clase) {
  return trazo(d, {
    class: clase,
    stroke: clase === "logo-ekg-pulse" ? "#e8f6ff" : "#123652",
    "stroke-width": clase === "logo-ekg-pulse" ? "3.4" : "2.8",
    pathLength: "100",
  });
}

function general(intro) {
  return lienzo("Medicina", [
    svg("path", { fill: "#123652", d: MONOGRAMA }),
    pulso(EKG, intro ? "logo-ekg" : "mark-signal"),
    intro ? pulso(EKG, "logo-ekg-pulse") : null,
  ]);
}

function cardio(intro) {
  return lienzo("Cardiología", [
    trazo(CORAZON, { class: "mark-pulse", "stroke-width": "3.2" }),
    pulso("M58 70 H78 l 4 -8 l 6 18 l 5 -10 H114", intro ? "logo-ekg" : "mark-signal"),
    intro ? pulso("M58 70 H78 l 4 -8 l 6 18 l 5 -10 H114", "logo-ekg-pulse") : null,
  ]);
}

function reuma() {
  return lienzo("Reumatología", [
    svg("line", {
      x1: "78", y1: "72", x2: "132", y2: "96",
      stroke: "#123652", "stroke-width": "14", "stroke-linecap": "round",
    }),
    svg("g", { class: "mark-joint" }, [
      svg("line", { x1: "24", y1: "112", x2: "132", y2: "32", stroke: "transparent", "stroke-width": "1" }),
      svg("line", {
        x1: "78", y1: "72", x2: "40", y2: "36",
        stroke: "#123652", "stroke-width": "14", "stroke-linecap": "round",
      }),
    ]),
    svg("circle", { cx: "78", cy: "72", r: "7", fill: "#D7E4F0", stroke: "#123652", "stroke-width": "2.4" }),
  ]);
}

function neuro() {
  return lienzo("Neurología", [
    trazo("M50 78 C50 48 66 36 85 36 C104 36 121 48 121 78 C121 98 106 108 85 108 C64 108 50 98 50 78 Z"),
    trazo("M85 40 V104"),
    pulso("M58 64 C72 74 98 54 116 68", "mark-signal"),
  ]);
}

function derma() {
  return lienzo("Dermatología", [
    trazo("M85 28 C64 28 50 46 50 64 C50 92 85 112 85 112 C85 112 120 92 120 64 C120 46 106 28 85 28 Z", { class: "mark-pulse" }),
    trazo("M68 62 H102", { "stroke-width": "2.2" }),
    trazo("M74 74 H96", { "stroke-width": "2.2" }),
  ]);
}

function pedia() {
  return lienzo("Pediatría", [
    svg("g", { class: "mark-bob" }, [
      svg("circle", { cx: "85", cy: "42", r: "14", fill: "none", stroke: "#123652", "stroke-width": "3" }),
      trazo("M85 58 V86"),
      trazo("M62 70 H108"),
      trazo("M85 86 L66 112"),
      trazo("M85 86 L104 112"),
    ]),
  ]);
}

function ojo() {
  return lienzo("Oftalmología", [
    trazo("M32 68 C52 42 118 42 139 68 C118 94 52 94 32 68 Z"),
    svg("circle", { cx: "85", cy: "68", r: "16", fill: "none", stroke: "#123652", "stroke-width": "3" }),
    svg("circle", { class: "mark-pupil", cx: "85", cy: "68", r: "6", fill: "#123652" }),
  ]);
}

function pulmo() {
  return lienzo("Neumología", [
    svg("g", { class: "mark-breath" }, [
      trazo("M84 36 V100"),
      trazo("M84 52 C70 52 48 58 48 78 C48 100 66 110 84 100"),
      trazo("M86 52 C100 52 122 58 122 78 C122 100 104 110 86 100"),
    ]),
  ]);
}

function gastro() {
  return lienzo("Gastroenterología", [
    pulso("M70 34 C70 34 58 48 62 64 C68 86 108 78 104 98 C100 116 78 112 74 100", "mark-signal"),
  ]);
}

function endo() {
  return lienzo("Endocrinología", [
    trazo("M85 30 C66 48 58 62 58 78 C58 98 70 112 85 112 C100 112 112 98 112 78 C112 62 104 48 85 30 Z", { class: "mark-pulse" }),
  ]);
}

function hueso() {
  return lienzo("Traumatología", [
    svg("g", { class: "mark-bone" }, [
      svg("line", {
        x1: "36", y1: "68", x2: "135", y2: "68",
        stroke: "#123652", "stroke-width": "10", "stroke-linecap": "round",
      }),
      svg("circle", { cx: "40", cy: "58", r: "8", fill: "none", stroke: "#123652", "stroke-width": "3" }),
      svg("circle", { cx: "40", cy: "78", r: "8", fill: "none", stroke: "#123652", "stroke-width": "3" }),
      svg("circle", { cx: "131", cy: "58", r: "8", fill: "none", stroke: "#123652", "stroke-width": "3" }),
      svg("circle", { cx: "131", cy: "78", r: "8", fill: "none", stroke: "#123652", "stroke-width": "3" }),
    ]),
  ]);
}

function gine() {
  return lienzo("Ginecología", [
    svg("circle", { class: "mark-pulse", cx: "72", cy: "68", r: "26", fill: "none", stroke: "#123652", "stroke-width": "3" }),
    svg("circle", { cx: "100", cy: "68", r: "26", fill: "none", stroke: "#123652", "stroke-width": "3" }),
  ]);
}

function mente() {
  return lienzo("Psiquiatría", [
    svg("circle", { cx: "85", cy: "68", r: "36", fill: "none", stroke: "#123652", "stroke-width": "3" }),
    pulso("M62 74 C74 50 96 50 108 74", "mark-signal"),
  ]);
}

function renal() {
  return lienzo("Nefrología", [
    trazo("M98 34 C70 34 52 52 52 74 C52 100 74 112 98 104 C78 98 70 86 74 70 C78 54 88 46 98 34 Z", { class: "mark-pulse" }),
  ]);
}

const MARCAS = {
  general,
  cardio,
  reuma,
  neuro,
  derma,
  pedia,
  ojo,
  pulmo,
  gastro,
  endo,
  hueso,
  gine,
  mente,
  renal,
};

export function crearLogo(clave, intro = false) {
  const marca = MARCAS[clave] || general;
  if (clave === "general" || clave === "cardio") return marca(intro);
  return marca();
}
