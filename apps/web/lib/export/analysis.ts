/**
 * Exportación del análisis de un sitio (M14, HU-12 AC1). Archivo compartido.
 * CSV de la serie temporal y de las métricas; JSON completo en el formato canónico del contrato.
 */
import { toJsonString } from "@bufbuild/protobuf";
import { timestampDate } from "@bufbuild/protobuf/wkt";
import { AnalysisResultSchema, type AnalysisResult } from "@lumen/sdk";

import type { Cell } from "./files";

export const ANALYSIS_CSV_HEADERS = [
  "time_utc",
  "sun_az_deg",
  "sun_el_deg",
  "sun_fraction",
  "earth_az_deg",
  "earth_el_deg",
  "earth_fraction",
  "horizon_at_sun_deg",
  "horizon_at_earth_deg",
  "eclipse_fraction",
  "sun_visible",
  "earth_visible",
  "operable",
];

export function analysisCsvRows(r: AnalysisResult): Cell[][] {
  const s = r.series;
  if (!s) return [];
  return s.time.map((t, i) => [
    timestampDate(t).toISOString(),
    s.sun?.azDeg[i],
    s.sun?.elDeg[i],
    s.sun?.fraction[i],
    s.earth?.azDeg[i],
    s.earth?.elDeg[i],
    s.earth?.fraction[i],
    s.horizonAtSunDeg[i],
    s.horizonAtEarthDeg[i],
    s.eclipseFraction[i],
    s.sunVisible[i],
    s.earthVisible[i],
    s.operable[i],
  ]);
}

/** Métricas escalares (número) como pares nombre, valor. */
export function metricsCsvRows(r: AnalysisResult): Cell[][] {
  if (!r.metrics) return [];
  return Object.entries(r.metrics)
    .filter(([, v]) => typeof v === "number")
    .map(([k, v]) => [k, v as number]);
}

export function analysisJson(r: AnalysisResult): string {
  // alwaysEmitImplicit: en proto3 los 0 se omiten; en una exportación cada métrica debe aparecer.
  return toJsonString(AnalysisResultSchema, r, { prettySpaces: 2, alwaysEmitImplicit: true });
}
