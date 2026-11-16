/**
 * Codecs compactos para escenarios compartibles por URL (M13, HU-10). Archivo compartido.
 * Un enlace manipulado o antiguo devuelve null y se ignora; nunca rompe la página.
 *
 *   pw = área,eficiencia,orientación,azimut,batería,SoC0,DoD,carga día,carga noche,ef. batería
 *   wi = nominal,retraso máx (d),paso (h),misión (d),métrica.métrica…,batería (0|1)
 */
import { PanelOrientation } from "@lumen/sdk";

import type { PowerForm } from "@/components/power/power-math";
import { METRICS, type MetricKey, type WhatIfForm } from "@/components/whatif/whatif-math";

const ORIENTATION_CODE: Record<number, string> = {
  [PanelOrientation.VERTICAL_TRACKING]: "vt",
  [PanelOrientation.HORIZONTAL]: "h",
  [PanelOrientation.VERTICAL_FIXED]: "vf",
};
const CODE_ORIENTATION: Record<string, PanelOrientation> = {
  vt: PanelOrientation.VERTICAL_TRACKING,
  h: PanelOrientation.HORIZONTAL,
  vf: PanelOrientation.VERTICAL_FIXED,
};

const num = (s: string | undefined): number | null => {
  if (s === undefined || s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export function encodePower(f: PowerForm): string {
  return [
    f.panelAreaM2,
    f.efficiency,
    ORIENTATION_CODE[f.orientation] ?? "vt",
    f.panelAzimuthDeg,
    f.batteryWh,
    f.soc0Pct,
    f.maxDodPct,
    f.loadDayW,
    f.loadNightW,
    f.batteryEfficiency,
  ].join(",");
}

export function decodePower(s: string): PowerForm | null {
  const p = s.split(",");
  if (p.length !== 10) return null;
  const orientation = CODE_ORIENTATION[p[2] ?? ""];
  const v = [0, 1, 3, 4, 5, 6, 7, 8, 9].map((i) => num(p[i]));
  if (orientation === undefined || v.some((x) => x === null)) return null;
  const [area, eff, az, bat, soc0, dod, day, night, etaB] = v as number[];
  return {
    panelAreaM2: area!,
    efficiency: eff!,
    orientation,
    panelAzimuthDeg: az!,
    batteryWh: bat!,
    soc0Pct: soc0!,
    maxDodPct: dod!,
    loadDayW: day!,
    loadNightW: night!,
    batteryEfficiency: etaB!,
  };
}

export function encodeWhatIf(f: WhatIfForm): string {
  return [
    f.nominal,
    f.maxDelayDays,
    f.stepHours,
    f.missionDays,
    f.metrics.join("."),
    f.withPower ? 1 : 0,
  ].join(",");
}

const KNOWN = new Set<string>(METRICS.map((m) => m.key));

export function decodeWhatIf(s: string): WhatIfForm | null {
  const p = s.split(",");
  if (p.length !== 6) return null;
  const [maxDelay, step, mission] = [num(p[1]), num(p[2]), num(p[3])];
  const metrics = (p[4] ?? "").split(".").filter((m): m is MetricKey => KNOWN.has(m));
  if (!p[0] || maxDelay === null || step === null || mission === null || metrics.length === 0) {
    return null;
  }
  return {
    nominal: p[0],
    maxDelayDays: maxDelay,
    stepHours: step,
    missionDays: mission,
    metrics,
    withPower: p[5] === "1",
  };
}
