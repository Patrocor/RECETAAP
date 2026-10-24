export const RUBRICA_MM_POR_OFFSET = 0.26;
export const RUBRICA_OFFSET_X_MAX = 720;
export const RUBRICA_OFFSET_Y_MAX = 560;
export const RUBRICA_ESCALA_MIN = 0.6;
export const RUBRICA_ESCALA_MAX = 1.8;

export function sanitizeRubricaAjuste(ajuste) {
  const x = Number(ajuste?.offsetX);
  const y = Number(ajuste?.offsetY);
  const esc = Number(ajuste?.escala);
  return {
    offsetX: Number.isFinite(x) ? Math.max(-RUBRICA_OFFSET_X_MAX, Math.min(RUBRICA_OFFSET_X_MAX, Math.round(x))) : 0,
    offsetY: Number.isFinite(y) ? Math.max(-RUBRICA_OFFSET_Y_MAX, Math.min(RUBRICA_OFFSET_Y_MAX, Math.round(y))) : 0,
    escala: Number.isFinite(esc)
      ? Math.max(RUBRICA_ESCALA_MIN, Math.min(RUBRICA_ESCALA_MAX, Math.round(esc * 100) / 100))
      : 1,
  };
}

export function plantillaRubrica(variante) {
  const cuarto = variante === "cuarto";
  return {
    variante: cuarto ? "cuarto" : "mitad",
    pageW: cuarto ? 105 : 210,
    pageH: 148.5,
    posX: cuarto ? 40 : 148,
    posY: cuarto ? 123.5 : 125.5,
    baseW: cuarto ? 52 : 46,
    baseH: 14,
  };
}

export function cajaRubrica(plantilla, ajuste) {
  const hoja = plantilla || plantillaRubrica("mitad");
  const a = sanitizeRubricaAjuste(ajuste);
  const { pageW, pageH, posX, posY, baseW, baseH } = hoja;
  const w = Math.max(8, Math.min(baseW * a.escala, pageW - 8));
  const h = Math.max(4, Math.min(baseH * a.escala, 22));
  const offX = a.offsetX * RUBRICA_MM_POR_OFFSET;
  const offY = a.offsetY * RUBRICA_MM_POR_OFFSET;
  const x = Math.max(3, Math.min(pageW - w - 3, posX + (baseW - w) / 2 + offX));
  const y = Math.max(3, Math.min(pageH - h - 3, posY + (baseH - h) / 2 + offY));
  return { ...hoja, ...a, w, h, x, y, offX, offY };
}

export function layoutRubrica(variante, ajuste) {
  return cajaRubrica(plantillaRubrica(variante), ajuste);
}

export function offsetsDesdePunto(variante, xMm, yMm, ajuste) {
  const actual = sanitizeRubricaAjuste(ajuste);
  const base = cajaRubrica(plantillaRubrica(variante), { ...actual, offsetX: 0, offsetY: 0 });
  const desiredX = Number(xMm) - base.w / 2;
  const desiredY = Number(yMm) - base.h / 2;
  const origenX = base.posX + (base.baseW - base.w) / 2;
  const origenY = base.posY + (base.baseH - base.h) / 2;
  return sanitizeRubricaAjuste({
    offsetX: (desiredX - origenX) / RUBRICA_MM_POR_OFFSET,
    offsetY: (desiredY - origenY) / RUBRICA_MM_POR_OFFSET,
    escala: actual.escala,
  });
}

export function puntoDesdeEvento(rect, clientX, clientY, variante) {
  const hoja = plantillaRubrica(variante);
  const ancho = Number(rect?.width);
  const alto = Number(rect?.height);
  if (!Number.isFinite(ancho) || !Number.isFinite(alto) || ancho < 8 || alto < 8) return null;
  return {
    xMm: ((Number(clientX) - Number(rect.left)) / ancho) * hoja.pageW,
    yMm: ((Number(clientY) - Number(rect.top)) / alto) * hoja.pageH,
    ...hoja,
  };
}

export function estiloPosicionRubrica(layout) {
  const caja = layout || layoutRubrica("mitad");
  return [
    `left:${(caja.x / caja.pageW) * 100}%`,
    `top:${(caja.y / caja.pageH) * 100}%`,
    `width:${(caja.w / caja.pageW) * 100}%`,
    `height:${(caja.h / caja.pageH) * 100}%`,
  ].join(";");
}
