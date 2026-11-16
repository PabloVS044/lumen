/**
 * Lógica pura del buscador de mejor punto (M12, HU-09). Owner: Frontend Analysis (issue #41).
 * Formulario ↔ `FindBestSpotRequest`, validación con las reglas del contrato, celdas del mapa de
 * calor y resumen textual.
 */
import { create } from "@bufbuild/protobuf";
import { FindBestSpotRequestSchema, validateMessage, type FindBestSpotRequest } from "@lumen/sdk";

import { parseUtc } from "@/components/horizon/use-analysis";
import { METRICS } from "@/components/whatif/whatif-math";

const MOON_RADIUS_KM = 1737.4;

/** Objetivos que acepta el motor: una métrica (metrics/score.py) o el score ponderado (9.7). */
export const OBJECTIVES = [
  ...METRICS.map(({ key, label, unit }) => ({ key, label, unit })),
  { key: "score", label: "Weighted score", unit: "0–1" },
] as { key: string; label: string; unit: string }[];

export interface SearchForm {
  lat: number;
  lon: number;
  start: string;
  end: string;
  radiusKm: number;
  spacingM: number;
  maxSlopeDeg: number;
  objective: string;
  topK: number;
}

/** Valores por defecto de la HU-09 y del motor (pendiente máx. 15°, top 5). */
export const DEFAULT_FORM: SearchForm = {
  lat: Number.NaN,
  lon: Number.NaN,
  start: "",
  end: "",
  radiusKm: 5,
  spacingM: 250,
  maxSlopeDeg: 15,
  objective: "illumination_pct",
  topK: 5,
};

const secs = (ms: number) => ({ seconds: BigInt(Math.floor(ms / 1000)) });

export function toFindRequest(f: SearchForm): FindBestSpotRequest {
  return create(FindBestSpotRequestSchema, {
    center: { lat: f.lat, lon: f.lon },
    radiusKm: f.radiusKm,
    spacingM: f.spacingM,
    maxSlopeDeg: f.maxSlopeDeg,
    range: { start: secs(parseUtc(f.start) ?? 0), end: secs(parseUtc(f.end) ?? 0) },
    objective: f.objective,
    topK: f.topK,
  });
}

const PROTO_TO_FORM: Record<string, keyof SearchForm> = {
  "center.lat": "lat",
  "center.lon": "lon",
  radius_km: "radiusKm",
  spacing_m: "spacingM",
  max_slope_deg: "maxSlopeDeg",
  top_k: "topK",
  objective: "objective",
};

export function validateForm(f: SearchForm): Partial<Record<keyof SearchForm, string>> {
  const out: Partial<Record<keyof SearchForm, string>> = {};
  for (const key of ["lat", "lon", "radiusKm", "spacingM", "maxSlopeDeg", "topK"] as const) {
    if (!Number.isFinite(f[key])) out[key] = "enter a number";
  }
  const start = parseUtc(f.start);
  const end = parseUtc(f.end);
  if (start === null) out.start = "enter a valid date";
  if (end === null) out.end = "enter a valid date";
  else if (start !== null && end <= start) out.end = "must be after the start";
  if (Object.keys(out).length) return out;

  const violations = validateMessage(FindBestSpotRequestSchema, toFindRequest(f)) ?? {};
  for (const [field, message] of Object.entries(violations)) {
    const key = PROTO_TO_FORM[field];
    if (key) out[key] = message;
  }
  return out;
}

/**
 * Celdas [x km, y km, valor] de la grilla del motor: fila mayor, fila 0 = y mínima, centro en el
 * medio. Ejes de la proyección del DEM (cerca del polo no son norte/este geográficos). Omite NaN.
 */
export function gridCells(
  values: number[],
  cols: number,
  rows: number,
  spacingM: number,
): [number, number, number][] {
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const km = (i: number) => Math.round(i * spacingM) / 1000;
  const cells: [number, number, number][] = [];
  values.forEach((v, i) => {
    if (!Number.isFinite(v)) return;
    const row = Math.floor(i / cols);
    const col = i % cols;
    cells.push([km(col - cx) || 0, km(row - cy) || 0, v]);
  });
  return cells;
}

/** Distancia sobre la esfera lunar de referencia (haversine), en km. */
export function surfaceDistanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
) {
  const r = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * MOON_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function searchSummary(
  center: { lat: number; lon: number },
  top: { lat: number; lon: number; value: number }[],
  objective: { label: string; unit: string },
): string {
  const best = top[0];
  if (!best) return "No spot within the radius meets the slope limit.";
  return (
    `Best spot: ${best.lat.toFixed(4)}, ${best.lon.toFixed(4)} with ${objective.label} ` +
    `${best.value.toFixed(1)} ${objective.unit}, ` +
    `${surfaceDistanceKm(center, best).toFixed(2)} km from the center.`
  );
}
