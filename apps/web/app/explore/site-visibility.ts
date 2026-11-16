"use client";

/**
 * Estado real de un sitio en `currentTime`: Sol y Tierra sobre el horizonte del terreno, según el motor
 * (las banderas `sun_visible` / `earth_visible` de AnalysisService.Analyze, con el horizonte real).
 * Es la misma consulta que usan el polar y el heatmap, así que comparte caché con ellos. Owner: Frontend 3D.
 */
import type { SiteStatus } from "@/components/globe/site-markers";
import { nearestIndex } from "@/components/horizon/polar-math";
import { parseUtc, useAnalysis } from "@/components/horizon/use-analysis";
import { useScenarioStore } from "@/stores/scenario-store";

import type { DateRange } from "./explore-links";

const SAMPLE_TOLERANCE_MS = 3_600_000;
const NO_SITE = { lat: 0, lon: 0 };
const NO_RANGE = { start: "", end: "" }; // rango inválido: no se consulta nada

interface SeriesLike {
  time: { seconds: bigint; nanos?: number }[];
  sunVisible: boolean[];
  earthVisible: boolean[];
}

/** Banderas de la muestra más cercana a `ms`; nada si `ms` queda fuera del rango analizado. */
export function visibilityAt(series: SeriesLike | undefined, ms: number): SiteStatus | undefined {
  if (!series || series.time.length === 0) return undefined;
  const times = series.time.map((t) => Number(t.seconds) * 1000 + (t.nanos ?? 0) / 1e6);
  const i = nearestIndex(times, ms);
  if (i < 0 || Math.abs(times[i]! - ms) > SAMPLE_TOLERANCE_MS) return undefined;
  const sun = series.sunVisible[i];
  const earth = series.earthVisible[i];
  return sun === undefined || earth === undefined ? undefined : { sun, earth };
}

export function useSiteVisibility(
  site: { lat: number; lon: number } | undefined,
  range: DateRange | null,
) {
  const currentTime = useScenarioStore((s) => s.currentTime);
  const { result } = useAnalysis(site ?? NO_SITE, site && range ? range : NO_RANGE);
  const ms = currentTime ? parseUtc(currentTime) : null;
  return ms === null ? undefined : visibilityAt(result?.series, ms);
}
