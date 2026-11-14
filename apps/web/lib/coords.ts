/**
 * Coordenadas lunares (convenciones de la sección 0). Owner: Frontend Charts/UX.
 * Longitud este positiva; la API usa [-180, 180), la UI acepta 0–360.
 */

export function normalizeLon(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

const DMS_RE =
  /^\s*(\d+(?:\.\d+)?)°\s*(?:(\d+(?:\.\d+)?)['′]\s*)?(?:(\d+(?:\.\d+)?)["″]\s*)?([NSEW])\s*$/i;

/** Parsea "89°27'S" o "222°41'E" o un decimal. Devuelve null si no es válido. */
export function parseAngle(input: string): number | null {
  const trimmed = input.trim();
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  const m = DMS_RE.exec(trimmed);
  if (!m) return null;
  const [, d = "0", min = "0", sec = "0", hemi = ""] = m;
  const value = Number(d) + Number(min) / 60 + Number(sec) / 3600;
  return /[SW]/i.test(hemi) ? -value : value;
}
