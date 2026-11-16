/**
 * Formato del informe de validación (ValidationService.GetReport, sección 14). Owner: Producto/Diseño + Ciencia.
 * `ValidationCheck` no trae unidad: se deduce del id de cada prueba conocida. Las pruebas nuevas
 * se muestran con la descripción del motor y sin unidad hasta que se añadan aquí.
 */
import type { ValidationCheck } from "@lumen/sdk";

export type CheckFields = Pick<
  ValidationCheck,
  "id" | "description" | "tolerance" | "maxError" | "passed"
>;
export type Unit = "deg" | "min" | "pct";
/**
 * `kind: "minimum"`: `tolerance` es un umbral que el valor debe superar y `maxError`, el déficit
 * bajo ese umbral (p. ej. la iluminación de PGDA). Sin `kind`, `maxError` es un error absoluto.
 */
export type CheckInfo = { label: string; reference?: string; unit?: Unit; kind?: "minimum" };

const NBSP = "\u00a0";

// Ids de services/engine/lumen_engine/validation/report.json.
const KNOWN: Record<string, CheckInfo> = {
  ephemeris_sun_vs_horizons: {
    label: "Sun azimuth and elevation",
    reference: "JPL Horizons",
    unit: "deg",
  },
  ephemeris_earth_vs_horizons: {
    label: "Earth azimuth and elevation",
    reference: "JPL Horizons",
    unit: "deg",
  },
  eclipse_vs_spice_occult: {
    label: "Eclipse start and end times",
    reference: "CSPICE occult()",
    unit: "min",
  },
  illumination_site01_rois_vs_pgda: {
    label: "Sunlight at Connecting ridge",
    reference: "NASA PGDA regions (Barker et al. 2021)",
    unit: "pct",
    kind: "minimum",
  },
};

const SUPERSCRIPT: Record<string, string> = {
  "-": "⁻",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

export function describeCheck(check: Pick<CheckFields, "id" | "description">): CheckInfo {
  return KNOWN[check.id] ?? { label: check.description || check.id };
}

const SUFFIX: Record<Unit, string> = { deg: "°", min: `${NBSP}min`, pct: `${NBSP}%` };

const withUnit = (text: string, unit?: Unit) => (unit ? `${text}${SUFFIX[unit]}` : text);

/** Dos cifras significativas y miles separados por espacio (convención SI del sitio). */
const twoDigits = (n: number) =>
  n.toLocaleString("en-US", { maximumSignificantDigits: 2 }).replace(/,/g, NBSP);

/** 0.01 → "0.01°"; por debajo de 0.001 pasa a potencias de diez: 9.256e-9 → "9.3 × 10⁻⁹°". */
export function formatMagnitude(value: number, unit?: Unit): string {
  if (value !== 0 && Math.abs(value) < 1e-3) {
    const [mantissa, exponent] = value.toExponential(1).split("e");
    const power = [...String(Number(exponent))].map((c) => SUPERSCRIPT[c]).join("");
    return withUnit(`${mantissa}${NBSP}×${NBSP}10${power}`, unit);
  }
  return withUnit(String(Number(value.toPrecision(3))), unit);
}

/** Cuántas veces cabe el peor error en la tolerancia; sin definir si el error es exactamente 0. */
export const margin = (tolerance: number, maxError: number) =>
  maxError > 0 ? tolerance / maxError : undefined;

export const formatMargin = (ratio: number) => `${twoDigits(ratio)}×`;

/** Textos de las columnas Limit, Worst error y Margin de una prueba. */
export function checkCells(check: CheckFields): { limit: string; worst: string; margin: string } {
  const { unit, kind } = describeCheck(check);
  if (kind === "minimum") {
    return {
      limit: `>${NBSP}${formatMagnitude(check.tolerance, unit)}`,
      worst: `${formatMagnitude(check.maxError, unit)}${NBSP}short`,
      margin: "n/a",
    };
  }
  const ratio = margin(check.tolerance, check.maxError);
  return {
    limit: formatMagnitude(check.tolerance, unit),
    worst: formatMagnitude(check.maxError, unit),
    margin: ratio === undefined ? "exact" : formatMargin(ratio),
  };
}

/** Resumen en texto del informe (sección 12.5: cada gráfico o tabla lleva su resumen). */
export function summarize(checks: CheckFields[]): string {
  if (checks.length === 0) return "The report has no checks yet.";
  const passed = checks.filter((c) => c.passed).length;
  const count =
    checks.length === 1
      ? `The only check ${passed ? "passes" : "fails"}.`
      : passed === checks.length
        ? `All ${checks.length} checks pass.`
        : `${passed} of ${checks.length} checks pass.`;

  const angles = checks.filter((c) => describeCheck(c).unit === "deg");
  if (angles.length === 0) return count;
  const worst = angles.reduce((a, b) => (b.maxError > a.maxError ? b : a));
  const error = formatMagnitude(worst.maxError, "deg");
  const limit = formatMagnitude(worst.tolerance, "deg");
  const ratio = margin(worst.tolerance, worst.maxError);
  const versus =
    worst.maxError > worst.tolerance
      ? `over the ${limit} limit`
      : ratio === undefined
        ? `within the ${limit} limit`
        : `${twoDigits(ratio)} times smaller than the ${limit} limit`;
  return `${count} The largest angle error is ${error}, ${versus}.`;
}
