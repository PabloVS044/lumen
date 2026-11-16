/**
 * Lógica pura del what-if de retraso (M9, HU-08). Owner: Frontend Analysis (issue #39).
 * Formulario ↔ `EvaluateRequest` del contrato, validación, tramos sin supervivencia y textos.
 */
import { create } from "@bufbuild/protobuf";
import { EvaluateRequestSchema, validateMessage, type EvaluateRequest } from "@lumen/sdk";

import { parseUtc, type SiteProp } from "@/components/horizon/use-analysis";
import { PRESETS, toPowerConfig } from "@/components/power/power-math";

/** Métricas que acepta el motor (metrics/score.py) con su sentido y unidad, para la UI. */
export const METRICS = [
  { key: "illumination_pct", label: "Sunlight", unit: "%", higherIsBetter: true },
  {
    key: "illumination_pct_weighted",
    label: "Sunlight (disk-weighted)",
    unit: "%",
    higherIsBetter: true,
  },
  { key: "longest_dark_h", label: "Longest darkness", unit: "h", higherIsBetter: false },
  { key: "earth_visible_pct", label: "Earth visible", unit: "%", higherIsBetter: true },
  { key: "earth_visible_h", label: "Earth visible", unit: "h", higherIsBetter: true },
  { key: "longest_comm_window_h", label: "Longest comm window", unit: "h", higherIsBetter: true },
  {
    key: "longest_comm_blackout_h",
    label: "Longest comm blackout",
    unit: "h",
    higherIsBetter: false,
  },
  { key: "operable_pct", label: "Operable (Sun and Earth)", unit: "%", higherIsBetter: true },
  {
    key: "longest_operable_window_h",
    label: "Longest operable window",
    unit: "h",
    higherIsBetter: true,
  },
  { key: "energy_kwh_per_m2", label: "Solar energy", unit: "kWh/m²", higherIsBetter: true },
] as const;

export type MetricKey = (typeof METRICS)[number]["key"];

/** Límite del motor: retraso máximo + duración ≤ MAX_RANGE_DAYS (730). */
export const ENGINE_MAX_RANGE_DAYS = 730;

export interface WhatIfForm {
  /** Fecha/hora ISO del aterrizaje nominal (UTC). */
  nominal: string;
  maxDelayDays: number;
  stepHours: number;
  missionDays: number;
  metrics: MetricKey[];
  withPower: boolean;
}

export const DEFAULT_FORM: WhatIfForm = {
  nominal: "",
  maxDelayDays: 30,
  stepHours: 24,
  missionDays: 14,
  metrics: ["illumination_pct", "longest_dark_h", "operable_pct"],
  withPower: false,
};

const secs = (ms: number) => ({ seconds: BigInt(Math.floor(ms / 1000)) });

export function toEvaluateRequest(site: SiteProp, form: WhatIfForm): EvaluateRequest {
  const nominal = parseUtc(form.nominal) ?? 0;
  return create(EvaluateRequestSchema, {
    site: { lat: site.lat, lon: site.lon, obsHeightM: site.obsHeightM ?? 0 },
    nominalLanding: secs(nominal),
    maxDelayDays: form.maxDelayDays,
    delayStepHours: form.stepHours,
    missionDurationDays: form.missionDays,
    metrics: [...form.metrics],
    // Batería con el preset documentado (§9.8); el detalle se ajusta en el simulador (M8).
    power: form.withPower ? toPowerConfig(PRESETS.small.values) : undefined,
  });
}

const PROTO_TO_FORM: Record<string, keyof WhatIfForm> = {
  max_delay_days: "maxDelayDays",
  delay_step_hours: "stepHours",
  mission_duration_days: "missionDays",
  nominal_landing: "nominal",
};

export function validateForm(
  site: SiteProp,
  form: WhatIfForm,
): Partial<Record<keyof WhatIfForm, string>> {
  const out: Partial<Record<keyof WhatIfForm, string>> = {};
  if (parseUtc(form.nominal) === null) out.nominal = "enter a valid date";
  for (const key of ["maxDelayDays", "stepHours", "missionDays"] as const) {
    if (!Number.isFinite(form[key]) || form[key] < 0) out[key] = "enter a positive number";
  }
  if (!Number.isInteger(form.maxDelayDays)) out.maxDelayDays = "whole days";
  if (!Number.isInteger(form.stepHours)) out.stepHours = "whole hours";
  if (form.metrics.length === 0) out.metrics = "choose at least one metric";
  if (Object.keys(out).length) return out;

  const violations = validateMessage(EvaluateRequestSchema, toEvaluateRequest(site, form)) ?? {};
  for (const [field, message] of Object.entries(violations)) {
    const key = PROTO_TO_FORM[field];
    if (key) out[key] = message;
  }
  if (!out.maxDelayDays && form.maxDelayDays + form.missionDays > ENGINE_MAX_RANGE_DAYS) {
    out.maxDelayDays = `delay + mission must be at most ${ENGINE_MAX_RANGE_DAYS} days`;
  }
  return out;
}

export interface PointView {
  delayHours: number;
  landingMs: number;
  metrics: Record<string, number>;
  survives?: boolean;
}

/** Tramos [primer, último] (en días de retraso) de retrasos consecutivos con brownout. */
export function failingSpans(points: PointView[]): [number, number][] {
  const spans: [number, number][] = [];
  points.forEach((pt, i) => {
    if (pt.survives !== false) return;
    const day = pt.delayHours / 24;
    const last = spans.at(-1);
    if (last && points[i - 1]?.survives === false) last[1] = day;
    else spans.push([day, day]);
  });
  return spans;
}

const days = (h: number) => {
  const d = h / 24;
  return Number.isInteger(d) ? `${d}` : d.toFixed(1);
};

/** Resumen textual (sección 12.5). */
export function whatIfSummary(points: PointView[], recommendedHours: number[]): string {
  const parts: string[] = [];
  if (recommendedHours.length === 0) {
    parts.push("No delay is recommended in this range.");
  } else {
    const best = points.find((pt) => pt.delayHours === recommendedHours.at(-1));
    const list = recommendedHours.map(days);
    const when = best ? ` (${new Date(best.landingMs).toISOString().slice(0, 10)})` : "";
    parts.push(
      list.length === 1
        ? `Recommended: land with a ${list[0]}-day delay${when}.`
        : `Recommended delays: ${list.join(", ")} days.`,
    );
  }
  const failing = points.filter((pt) => pt.survives === false).length;
  if (points.some((pt) => pt.survives !== undefined)) {
    parts.push(`${failing} of ${points.length} delays brown out the battery.`);
  }
  return parts.join(" ");
}
