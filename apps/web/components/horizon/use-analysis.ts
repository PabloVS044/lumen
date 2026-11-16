"use client";

/**
 * Análisis del motor para los gráficos de un sitio y un rango (M2, M3). Owner: Frontend Charts.
 * Un solo `AnalysisService.Analyze` alimenta polar y heatmap; comparten caché (misma entrada).
 */
import { useQuery } from "@connectrpc/connect-query";
import { AnalysisService } from "@lumen/sdk";
import { skipToken } from "@tanstack/react-query";

export interface SiteProp {
  lat: number;
  lon: number;
  obsHeightM?: number;
}

/** Fechas ISO (con o sin hora). Sin zona se interpretan como UTC. */
export interface RangeProp {
  start: string;
  end: string;
}

/** ISO como UTC; sin zona ("2027-01-15T06:00") también. null si no es una fecha. */
export function parseUtc(s: string) {
  const zoned = /(Z|[+-]\d{2}:?\d{2})$/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s);
  const ms = Date.parse(zoned ? s : `${s}Z`);
  return Number.isNaN(ms) ? null : ms;
}

const secs = (ms: number) => ({ seconds: BigInt(Math.floor(ms / 1000)) });
const POLL_MS = 2000;

/** Entrada de Analyze para un sitio y rango; null si el rango no es válido. La usa también la exportación. */
export function analysisInput(site: SiteProp, range: RangeProp) {
  const start = parseUtc(range.start);
  const end = parseUtc(range.end);
  if (start === null || end === null || end <= start) return null;
  return {
    site: { lat: site.lat, lon: site.lon, obsHeightM: site.obsHeightM ?? 0 },
    range: { start: secs(start), end: secs(end), stepMinutes: 60 },
    options: { includeSeries: true, includeMask: true },
  };
}

export function useAnalysis(site: SiteProp, range: RangeProp) {
  const input = analysisInput(site, range);
  const invalidRange = input === null;
  const query = useQuery(AnalysisService.method.analyze, input ?? skipToken, {
    staleTime: Infinity,
    // Sin caché el motor encola el cálculo: se vuelve a preguntar hasta que haya resultado.
    refetchInterval: (q) => (q.state.data?.outcome.case === "job" ? POLL_MS : false),
  });
  const outcome = query.data?.outcome;
  return {
    result: outcome?.case === "result" ? outcome.value : undefined,
    queued: outcome?.case === "job",
    error: query.error,
    pending: !invalidRange && query.isPending,
    invalidRange,
  };
}
