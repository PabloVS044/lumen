/**
 * Filas del comparador (HU-04 AC1) y mejor valor por fila (AC2). Owner: Frontend Analysis (R6).
 * Las cifras son las del motor; aquí solo se elige cuál es mayor o menor.
 */
import type { Metrics } from "@lumen/sdk";

import { formatDeg, formatDuration } from "@/lib/format";

export type Better = "high" | "low";

export interface CompareRow {
  /** Nombre de la métrica en el proto (clave de best_by_metric). */
  key: string;
  label: string;
  better: Better;
  get: (m: Metrics) => number | undefined;
  format: (v: number) => string;
}

const pct = (v: number) => `${v.toFixed(1)}%`;

export const COMPARE_ROWS: CompareRow[] = [
  {
    key: "illumination_pct",
    label: "Time in sunlight",
    better: "high",
    get: (m) => m.illuminationPct,
    format: pct,
  },
  {
    key: "longest_dark_h",
    label: "Longest dark period",
    better: "low",
    get: (m) => m.longestDarkH,
    format: formatDuration,
  },
  {
    key: "earth_visible_h",
    label: "Hours with Earth in view",
    better: "high",
    get: (m) => m.earthVisibleH,
    format: formatDuration,
  },
  {
    key: "longest_comm_window_h",
    label: "Longest contact window",
    better: "high",
    get: (m) => m.longestCommWindowH,
    format: formatDuration,
  },
  {
    key: "sun_elev_mean_visible_deg",
    label: "Mean Sun elevation when lit",
    better: "high",
    get: (m) => m.sunElevMeanVisibleDeg,
    format: (v) => formatDeg(v),
  },
  {
    key: "sun_elev_max_deg",
    label: "Highest Sun elevation",
    better: "high",
    get: (m) => m.sunElevMaxDeg,
    format: (v) => formatDeg(v),
  },
  {
    key: "operable_pct",
    label: "Sunlight and Earth together",
    better: "high",
    get: (m) => m.operablePct,
    format: pct,
  },
];

/** Índices con el mejor valor (empates incluidos); vacío si todos son iguales o faltan. */
export function bestIndices(values: (number | undefined)[], better: Better): number[] {
  const present = values.filter((v): v is number => v !== undefined && Number.isFinite(v));
  if (present.length < 2 || present.every((v) => v === present[0])) return [];
  const best = better === "high" ? Math.max(...present) : Math.min(...present);
  return values.flatMap((v, i) => (v === best ? [i] : []));
}
