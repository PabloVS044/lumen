/**
 * Matemática del visor polar (M2, sección 12.2). Owner: Frontend Charts.
 * Azimut desde el norte en sentido horario, elevación en grados, norte hacia arriba.
 */
import { scaleLinear } from "d3";

export type RadialMode = "full" | "zoom";

const LUNAR_RADIUS_M = 1_737_400;

/**
 * Escala radial no lineal: centro = cenit, borde (1) = -5°. En modo "full" el círculo de 0° queda a
 * 0.8 y el anillo de 15° a 0.35, para que el tramo [-3°, +10°] donde ocurre todo tenga espacio.
 * En modo "zoom" -5°..15° ocupan todo el radio (por encima de 15° queda en el centro).
 */
export function radialScale(mode: RadialMode) {
  return (
    mode === "zoom"
      ? scaleLinear().domain([-5, 15]).range([1, 0])
      : scaleLinear().domain([-5, 0, 15, 90]).range([1, 0.8, 0.35, 0])
  ).clamp(true);
}

export function toXY(azDeg: number, radius: number) {
  const a = (azDeg * Math.PI) / 180;
  return { x: radius * Math.sin(a), y: -radius * Math.cos(a) };
}

/** Depresión del horizonte matemático para un observador a `heightM` (sin refracción): negativa. */
export const dipDeg = (heightM: number) =>
  -(Math.acos(LUNAR_RADIUS_M / (LUNAR_RADIUS_M + heightM)) * 180) / Math.PI;

interface PathPoint {
  az: number;
  el: number;
  visible: boolean;
}

export interface Segment {
  visible: boolean;
  points: { az: number; el: number }[];
}

/**
 * Parte una trayectoria en tramos visibles/ocultos (los ocultos se dibujan punteados). Los tramos
 * vecinos comparten un punto (el último del anterior) para que no queden huecos; el salto de azimut 360→0 corta la línea.
 */
export function splitSegments(path: PathPoint[]): Segment[] {
  const out: Segment[] = [];
  let cur: Segment | undefined;
  path.forEach((pt, i) => {
    const prev = path[i - 1];
    const wrapped = prev !== undefined && Math.abs(pt.az - prev.az) > 180;
    if (!cur || wrapped || pt.visible !== cur.visible) {
      const bridge = prev && !wrapped ? [{ az: prev.az, el: prev.el }] : [];
      cur = { visible: pt.visible, points: bridge };
      out.push(cur);
    }
    cur.points.push({ az: pt.az, el: pt.el });
  });
  return out;
}

export function nearestIndex(timesMs: number[], ms: number) {
  let best = -1;
  let bestDt = Infinity;
  timesMs.forEach((t, i) => {
    const dt = Math.abs(t - ms);
    if (dt < bestDt) [best, bestDt] = [i, dt];
  });
  return best;
}

/** Radio (fracción del radio del gráfico) de un disco de `diameterDeg` centrado en `elDeg`. */
export const angularRadiusFraction = (
  scale: ReturnType<typeof radialScale>,
  elDeg: number,
  diameterDeg: number,
) => Math.abs(scale(elDeg - diameterDeg / 2) - scale(elDeg + diameterDeg / 2)) / 2;

/** Índice del punto (en x, y) más cercano a la posición dada; -1 si no hay puntos. */
export function nearestXY(points: { x: number; y: number }[], x: number, y: number) {
  let best = -1;
  let bestD = Infinity;
  points.forEach((p, i) => {
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bestD) [best, bestD] = [i, d];
  });
  return best;
}

interface PolarSummaryInput {
  terrainMax?: { el: number; az: number };
  sunVisiblePct: number;
  earthVisiblePct: number;
  longestDarkH: number;
  longestBlackoutH: number;
  now?: {
    time: string;
    sun: { az: number; el: number; visible: boolean };
    earth: { az: number; el: number; visible: boolean };
  };
}

const f1 = (n: number) => n.toFixed(1);
const where = (v: boolean) => (v ? "above" : "below");

/** Resumen en texto del gráfico (sección 12.5). */
export function polarSummary(i: PolarSummaryInput) {
  const parts = [
    i.terrainMax
      ? `The terrain horizon peaks at ${f1(i.terrainMax.el)}° elevation toward azimuth ${f1(i.terrainMax.az)}°.`
      : "",
    `The Sun is above the terrain horizon ${f1(i.sunVisiblePct)}% of the time; the longest dark spell lasts ${f1(i.longestDarkH)} h.`,
    `The Earth is above the terrain horizon ${f1(i.earthVisiblePct)}% of the time; the longest communications blackout lasts ${f1(i.longestBlackoutH)} h.`,
    i.now
      ? `At ${i.now.time} UTC the Sun is at azimuth ${f1(i.now.sun.az)}°, elevation ${f1(i.now.sun.el)}° (${where(i.now.sun.visible)} the terrain horizon) and the Earth at azimuth ${f1(i.now.earth.az)}°, elevation ${f1(i.now.earth.el)}° (${where(i.now.earth.visible)} the terrain horizon).`
      : "",
  ];
  return parts.filter(Boolean).join(" ");
}
