/** Texto plano para la interfaz y el PDF. No interpreta HTML. */

export function cleanText(value, max = 200) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function cleanMultiline(value, max = 800) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, max);
}

export function onlyDigits(value, max = 8) {
  return String(value ?? "").replace(/\D/g, "").slice(0, max);
}

export function validarEdad(value) {
  if (value === "" || value == null) return "Indica la edad.";
  if (!/^\d{1,3}$/.test(String(value))) return "La edad debe ser un número.";
  const n = Number(value);
  if (n > 130) return "La edad debe estar entre 0 y 130.";
  return "";
}

export function validarDni(value) {
  if (!value) return "";
  if (!/^\d{8}$/.test(String(value))) return "El DNI debe tener 8 dígitos.";
  return "";
}

export function validarEmail(value) {
  if (!value) return "";
  if (value.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "El correo no es válido.";
  }
  return "";
}

export function perfilListo(perfil) {
  return Boolean(cleanText(perfil?.nombre, 120) && cleanText(perfil?.cmp, 20));
}

export function fileSlug(nombre) {
  const base = cleanText(nombre, 40)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return base || "paciente";
}
