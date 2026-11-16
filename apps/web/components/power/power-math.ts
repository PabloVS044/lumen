/**
 * Lógica pura del simulador de batería (M8, HU-07). Owner: Frontend Analysis (issue #38).
 * Formulario ↔ `PowerConfig` del contrato, validación con las reglas `buf.validate` del .proto,
 * agregación diaria y textos. Sin datos de ejemplo: los valores del preset vienen del doc (9.8).
 */
import { create } from "@bufbuild/protobuf";
import { PanelOrientation, PowerConfigSchema, validateMessage, type PowerConfig } from "@lumen/sdk";

export interface PowerForm {
  panelAreaM2: number;
  efficiency: number;
  orientation: PanelOrientation;
  panelAzimuthDeg: number;
  batteryWh: number;
  soc0Pct: number;
  maxDodPct: number;
  loadDayW: number;
  loadNightW: number;
  batteryEfficiency: number;
}

/** Preset documentado en la sección 9.8. Los presets "mediano" y "rover" no tienen valores en el doc. */
export const PRESETS = {
  small: {
    label: "Small lander (technical doc §9.8)",
    values: {
      panelAreaM2: 2,
      efficiency: 0.28,
      orientation: PanelOrientation.VERTICAL_TRACKING,
      panelAzimuthDeg: 0,
      batteryWh: 2000,
      soc0Pct: 100,
      maxDodPct: 80,
      loadDayW: 150,
      loadNightW: 60,
      batteryEfficiency: 0.95,
    } satisfies PowerForm,
  },
} as const;

export const ORIENTATIONS = [
  { value: PanelOrientation.VERTICAL_TRACKING, label: "Vertical, tracking the Sun" },
  { value: PanelOrientation.HORIZONTAL, label: "Horizontal" },
  { value: PanelOrientation.VERTICAL_FIXED, label: "Vertical, fixed azimuth" },
] as const;

/** Todos los campos se envían explícitos (proto3 `optional`): un 0 del usuario significa 0. */
export function toPowerConfig(form: PowerForm): PowerConfig {
  return create(PowerConfigSchema, {
    panelAreaM2: form.panelAreaM2,
    efficiency: form.efficiency,
    orientation: form.orientation,
    panelAzimuthDeg:
      form.orientation === PanelOrientation.VERTICAL_FIXED ? form.panelAzimuthDeg : undefined,
    batteryWh: form.batteryWh,
    soc0Pct: form.soc0Pct,
    maxDodPct: form.maxDodPct,
    loadDayW: form.loadDayW,
    loadNightW: form.loadNightW,
    batteryEfficiency: form.batteryEfficiency,
  });
}

const PROTO_TO_FORM: Record<string, keyof PowerForm> = {
  panel_area_m2: "panelAreaM2",
  efficiency: "efficiency",
  orientation: "orientation",
  panel_azimuth_deg: "panelAzimuthDeg",
  battery_wh: "batteryWh",
  soc0_pct: "soc0Pct",
  max_dod_pct: "maxDodPct",
  load_day_w: "loadDayW",
  load_night_w: "loadNightW",
  battery_efficiency: "batteryEfficiency",
};

/** Errores por campo con las mismas reglas que aplica el motor ({} = válido). */
export function validateForm(form: PowerForm): Partial<Record<keyof PowerForm, string>> {
  const violations = validateMessage(PowerConfigSchema, toPowerConfig(form)) ?? {};
  const out: Partial<Record<keyof PowerForm, string>> = {};
  for (const [field, message] of Object.entries(violations)) {
    const key = PROTO_TO_FORM[field];
    if (key) out[key] = message;
  }
  if (Number.isNaN(form.panelAzimuthDeg) && form.orientation === PanelOrientation.VERTICAL_FIXED)
    out.panelAzimuthDeg = "required for a fixed panel";
  return out;
}

export interface DailyEnergy {
  day: string;
  minSocPct: number;
  generatedKwh: number;
  consumedKwh: number;
}

/** Agregación por día UTC. La energía integra cada muestra durante el paso de la serie. */
export function dailyEnergy(
  timesMs: number[],
  socPct: number[],
  genW: number[],
  loadW: number[],
): DailyEnergy[] {
  const stepH = timesMs.length > 1 ? (timesMs[1]! - timesMs[0]!) / 3_600_000 : 1;
  const rows = new Map<string, DailyEnergy>();
  timesMs.forEach((t, i) => {
    const day = new Date(t).toISOString().slice(0, 10);
    const row = rows.get(day) ?? {
      day,
      minSocPct: Number.POSITIVE_INFINITY,
      generatedKwh: 0,
      consumedKwh: 0,
    };
    row.minSocPct = Math.min(row.minSocPct, socPct[i] ?? Number.POSITIVE_INFINITY);
    row.generatedKwh += ((genW[i] ?? 0) * stepH) / 1000;
    row.consumedKwh += ((loadW[i] ?? 0) * stepH) / 1000;
    rows.set(day, row);
  });
  return [...rows.values()];
}

export interface Verdict {
  survives: boolean;
  minSocPct: number;
  energyMarginWh: number;
  /** "YYYY-MM-DD HH:MM" UTC del primer brownout, o null. */
  brownoutAt: string | null;
}

/** Resumen textual del resultado (sección 12.5: cada gráfico tiene su resumen en texto). */
export function powerSummary(v: Verdict): string {
  if (v.survives) {
    return (
      `The lander survives the whole range. Battery charge never drops below ` +
      `${Math.round(v.minSocPct)}%, ${Math.round(v.energyMarginWh)} Wh above the reserve.`
    );
  }
  return (
    `Power runs out on ${v.brownoutAt} UTC. Over the range, ` +
    `${Math.round(Math.abs(v.energyMarginWh))} Wh of load could not be served.`
  );
}

/**
 * Al mediodía la elevación solar es ≈ 90° − |lat|; un panel horizontal (sin el) rinde más que uno
 * vertical (cos el) cuando el > 45°, es decir, |lat| < 45°. El default vertical es para los polos.
 */
export function polarPanelHint(lat: number, orientation: PanelOrientation): boolean {
  return orientation === PanelOrientation.VERTICAL_TRACKING && Math.abs(lat) < 45;
}
