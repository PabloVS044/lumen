/**
 * Coordenadas lunares (convenciones de la sección 0). Owner: Frontend Charts/UX.
 * Longitud este positiva; la API usa [-180, 180), la UI acepta 0–360 (HU-01 AC1).
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

export type ParsedAngle = { ok: true; value: number } | { ok: false; error: string };

const hemisphereOf = (input: string) => /([NSEW])\s*$/i.exec(input)?.[1]?.toUpperCase();

/** Latitud en grados, decimal o DMS (HU-01 AC2), dentro de [-90, 90]. */
export function parseLatitude(input: string): ParsedAngle {
  if (!input.trim()) return { ok: false, error: "Enter a latitude." };
  if (/[EW]/.test(hemisphereOf(input) ?? "")) {
    return { ok: false, error: "Latitude takes N or S, not E or W." };
  }
  const value = parseAngle(input);
  if (value === null) {
    return { ok: false, error: "Write a decimal (-89.45) or degrees and minutes (89°27'S)." };
  }
  if (value < -90 || value > 90) {
    return { ok: false, error: "Latitude must be between -90 and 90." };
  }
  return { ok: true, value };
}

/** Longitud este positiva en [-180, 360), devuelta en [-180, 180) como la API (HU-01 AC1). */
export function parseLongitude(input: string): ParsedAngle {
  if (!input.trim()) return { ok: false, error: "Enter a longitude." };
  if (/[NS]/.test(hemisphereOf(input) ?? "")) {
    return { ok: false, error: "Longitude takes E or W, not N or S." };
  }
  const value = parseAngle(input);
  if (value === null) {
    return { ok: false, error: "Write a decimal (-137.31) or degrees and minutes (222°41'E)." };
  }
  if (value < -180 || value >= 360) {
    return { ok: false, error: "Longitude must be between -180 and 360." };
  }
  return { ok: true, value: normalizeLon(value) };
}

/** "89.450° S, 137.310° W": hemisferios explícitos y longitud en [-180, 180). */
export function formatLatLon(lat: number, lon: number, digits = 3): string {
  const l = normalizeLon(lon);
  const ns = `${Math.abs(lat).toFixed(digits)}° ${lat < 0 ? "S" : "N"}`;
  const ew = `${Math.abs(l).toFixed(digits)}° ${l < 0 ? "W" : "E"}`;
  return `${ns}, ${ew}`;
}
