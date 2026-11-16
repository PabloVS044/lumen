"use client";

/**
 * Countdowns — M7 Contadores (HU-06). Owner: Frontend Charts (ver docs/team/ROLES.md).
 * Respecto a currentTime: si el cuerpo está arriba, cuánto falta para que se oculte; si no, para que
 * salga (sección 9.6). Los eventos vienen del motor (AnalysisResult.events). Sin reloj todavía
 * (nadie lo movió), el instante es `t` de la URL o el inicio del periodo.
 */
import { timestampDate } from "@bufbuild/protobuf/wkt";
import type { AnalysisResult } from "@lumen/sdk";
import { Earth, Sun, SunDim } from "lucide-react";
import { useQueryState } from "nuqs";
import { useMemo } from "react";

import { analysisStatus } from "@/components/horizon/analysis-status";
import { nearestIndex } from "@/components/horizon/polar-math";
import {
  parseUtc,
  useAnalysis,
  type RangeProp,
  type SiteProp,
} from "@/components/horizon/use-analysis";
import { siteSearchParams } from "@/lib/url-state";
import { useScenarioStore } from "@/stores/scenario-store";
import { formatDuration, formatUtc } from "@/lib/format";
import { cn } from "@/lib/utils";

import { nextChange, type Body } from "./countdown-model";

const HOUR_MS = 3_600_000;

const COPY: Record<Body, { name: string; up: string; down: string; set: string; rise: string }> = {
  sun: {
    name: "Sun",
    up: "The Sun is up",
    down: "The Sun is down",
    set: "Sunset",
    rise: "Sunrise",
  },
  earth: {
    name: "Earth",
    up: "Earth is in view",
    down: "Earth is out of view",
    set: "Earthset",
    rise: "Earthrise",
  },
};

export function CountdownsView({
  result,
  currentMs,
  compact = false,
}: {
  result: AnalysisResult;
  currentMs: number | null;
  compact?: boolean;
}) {
  const s = result.series;
  const times = useMemo(() => s?.time.map((t) => timestampDate(t).getTime()) ?? [], [s]);
  const events = useMemo(
    () =>
      result.events
        .filter((e) => e.time)
        .map((e) => ({ type: e.type, ms: timestampDate(e.time!).getTime() })),
    [result.events],
  );
  if (currentMs === null || times.length === 0) return null;
  const i = nearestIndex(times, currentMs);

  return (
    <div className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "md:grid-cols-2")}>
      {(["sun", "earth"] as const).map((body) => {
        const up = (body === "sun" ? s?.sunVisible : s?.earthVisible)?.[i] ?? false;
        const next = nextChange(events, body, up, currentMs);
        const c = COPY[body];
        const Icon = body === "earth" ? Earth : up ? Sun : SunDim;
        const verb = next.kind === "set" ? "Sets" : "Rises";
        return (
          <div
            key={body}
            role="group"
            aria-label={c.name}
            className="flex items-start gap-3 rounded-lg border border-surface bg-panel p-4"
          >
            <Icon
              aria-hidden
              className={cn(
                "mt-0.5 size-5 shrink-0",
                up ? (body === "sun" ? "text-sun" : "text-earth") : "text-muted",
              )}
            />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium">{up ? c.up : c.down}</p>
              {next.atMs !== null ? (
                <>
                  <p className="font-mono text-lg tabular-nums">
                    {verb} in {formatDuration((next.atMs - currentMs) / HOUR_MS)}
                  </p>
                  <p className="font-mono text-xs text-muted">
                    {next.kind === "set" ? c.set : c.rise} at {formatUtc(next.atMs)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">
                  No {next.kind === "set" ? c.set : c.rise} before the end of the period
                  {times.at(-1) !== undefined && ` (${formatUtc(times.at(-1)!)})`}.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Countdowns({
  site,
  range,
  compact = false,
}: {
  site: SiteProp;
  range: RangeProp;
  compact?: boolean;
}) {
  const analysis = useAnalysis(site, range);
  const currentTime = useScenarioStore((s) => s.currentTime);
  const [t] = useQueryState("t", siteSearchParams.t);
  const startMs = parseUtc(range.start);
  const endMs = parseUtc(range.end);
  const raw = (currentTime ? parseUtc(currentTime) : null) ?? (t ? parseUtc(t) : null) ?? startMs;
  const currentMs =
    raw === null || startMs === null || endMs === null
      ? null
      : Math.min(endMs, Math.max(startMs, raw));
  const status = analysisStatus(analysis, "countdowns");
  if (status) return status;
  return <CountdownsView result={analysis.result!} currentMs={currentMs} compact={compact} />;
}
