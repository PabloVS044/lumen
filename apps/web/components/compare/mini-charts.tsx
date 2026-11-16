/**
 * Mini-polar y mini-heatmap para las columnas del comparador (HU-04 AC3). Owner: Frontend Analysis.
 * Misma geometría y resumen que HorizonPolar (polar-math), sin interacción.
 */
import { timestampDate } from "@bufbuild/protobuf/wkt";
import type { AnalysisResult } from "@lumen/sdk";
import { line } from "d3";
import { useId, useMemo } from "react";

import { polarSummary, radialScale, splitSegments, toXY } from "@/components/horizon/polar-math";
import { cn } from "@/lib/utils";

import { hourlyGrid } from "./hourly-grid";

const R = 56;
const EDGE = -5;
const toPath = line<[number, number]>();

export function MiniPolar({ result, name }: { result: AnalysisResult; name: string }) {
  const id = useId();
  const s = result.series;
  const mask = result.horizon;
  const scale = useMemo(() => radialScale("full"), []);
  const xy = (az: number, el: number): [number, number] => {
    const p = toXY(az, scale(el) * R);
    return [p.x, p.y];
  };

  const paths = useMemo(() => {
    const out: { key: string; d: string; cls: string; dashed: boolean }[] = [];
    for (const body of ["earth", "sun"] as const) {
      const az = s?.[body]?.azDeg ?? [];
      const el = s?.[body]?.elDeg ?? [];
      const vis = (body === "sun" ? s?.sunVisible : s?.earthVisible) ?? [];
      const pts = az.map((a, i) => ({ az: a, el: el[i] ?? 0, visible: vis[i] ?? false }));
      splitSegments(pts).forEach((seg, k) => {
        out.push({
          key: `${body}-${k}`,
          d: toPath(seg.points.map((p) => xy(p.az, p.el))) ?? "",
          cls: body === "sun" ? "stroke-sun" : "stroke-earth",
          dashed: !seg.visible,
        });
      });
    }
    return out;
    // xy depende solo de `scale`, que es estable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, scale]);

  const step = mask?.azStepDeg || 0.25;
  const terrain =
    mask && mask.elevationDeg.length > 0
      ? `M${-R},0 A${R},${R} 0 1,0 ${R},0 A${R},${R} 0 1,0 ${-R},0 Z M${mask.elevationDeg
          .map((el, i) => xy(i * step, Math.max(el, EDGE)).join(","))
          .join("L")}Z`
      : "";
  const terrainMax = mask?.elevationDeg.length
    ? mask.elevationDeg.reduce((best, el, i) => (el > best.el ? { el, az: i * step } : best), {
        el: -Infinity,
        az: 0,
      })
    : undefined;
  const m = result.metrics;
  const summary = m
    ? polarSummary({
        terrainMax,
        sunVisiblePct: m.illuminationPct,
        earthVisiblePct: m.earthVisiblePct,
        longestDarkH: m.longestDarkH,
        longestBlackoutH: m.longestCommBlackoutH,
      })
    : "";

  return (
    <>
      <svg
        role="img"
        aria-label={`Horizon of ${name}`}
        aria-describedby={id}
        viewBox={`${-R - 2} ${-R - 2} ${2 * R + 4} ${2 * R + 4}`}
        className="mx-auto block size-32"
      >
        <circle r={R} className="fill-space stroke-surface" />
        {terrain && <path d={terrain} fillRule="evenodd" className="fill-surface" />}
        {paths.map((p) => (
          <path
            key={p.key}
            d={p.d}
            className={cn("fill-none", p.cls)}
            strokeWidth={p.dashed ? 1 : 1.5}
            strokeDasharray={p.dashed ? "1 3" : undefined}
          />
        ))}
        <text y={-R + 9} textAnchor="middle" className="fill-muted text-[8px]">
          N
        </text>
      </svg>
      <span id={id} className="sr-only">
        {summary}
      </span>
    </>
  );
}

export function MiniHeatmap({ result, name }: { result: AnalysisResult; name: string }) {
  const s = result.series;
  const grid = useMemo(() => {
    const times = s?.time.map((t) => timestampDate(t).getTime()) ?? [];
    const step = times.length > 1 ? times[1]! - times[0]! : 3_600_000;
    return hourlyGrid(
      times,
      (s?.operable ?? []).map((o) => (o ? 1 : 0)),
      times[0] ?? 0,
      (times.at(-1) ?? 0) + 1,
      step,
    );
  }, [s]);
  const rowH = Math.max(1, Math.min(4, Math.floor(120 / grid.days.length)));
  const pct = result.metrics ? Math.round(result.metrics.operablePct) : null;
  return (
    <svg
      role="img"
      aria-label={`Hours with sunlight and Earth contact at ${name}${pct === null ? "" : `: ${pct}% of the period`}`}
      viewBox={`0 0 ${24 * 4} ${grid.days.length * rowH}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      className="mx-auto block h-24 w-32"
    >
      <rect
        width={24 * 4}
        height={grid.days.length * rowH}
        className="fill-surface"
        fillOpacity={0.35}
      />
      {grid.cells.map((row, d) =>
        row.map((v, h) =>
          v ? (
            <rect
              key={`${d}-${h}`}
              x={h * 4}
              y={d * rowH}
              width={4}
              height={rowH}
              className="fill-text"
              fillOpacity={v}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
