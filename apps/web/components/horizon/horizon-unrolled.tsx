"use client";

/**
 * HorizonUnrolled — M2 Horizonte desplegado. Owner: Frontend Charts (ver docs/team/ROLES.md).
 * Especificación: sección 12.2 ("eje X azimut 0–360°, eje Y elevación con zoom"). Mismas capas, datos
 * y reloj que HorizonPolar: `useAnalysis(site, range)` (caché compartida) y `currentTime` del store.
 */
import { line, scaleLinear } from "d3";
import { useId, useMemo, useState, type PointerEvent } from "react";

import { cn } from "@/lib/utils";
import { useScenarioStore } from "@/stores/scenario-store";

import { analysisStatus } from "./analysis-status";
import { dipDeg, nearestIndex, polarSummary, splitSegments } from "./polar-math";
import { parseUtc, useAnalysis, type RangeProp, type SiteProp } from "./use-analysis";

const W = 720;
const H = 300;
const M = { top: 12, right: 12, bottom: 30, left: 40 };
const EDGE = -5;
const MAX_POINTS = 4000;
const HOVER_DIST = 10;

const RANGES = {
  band: { label: "Horizon band", top: 15, ticks: [-5, 0, 5, 10, 15] },
  sky: { label: "Whole sky", top: 90, ticks: [0, 15, 30, 60, 90] },
} as const;
type RangeKey = keyof typeof RANGES;
type Body = "sun" | "earth";

const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
const dirOf = (az: number) => DIRS[Math.round((((az % 360) + 360) % 360) / 45) % 8]!;
const f1 = (n: number) => n.toFixed(1);
const STROKE: Record<Body, string> = { sun: "stroke-sun", earth: "stroke-earth" };
const FILL: Record<Body, string> = { sun: "fill-sun", earth: "fill-earth" };

export function HorizonUnrolled({ site, range }: { site: SiteProp; range: RangeProp }) {
  const ids = useId();
  const analysis = useAnalysis(site, range);
  const { result } = analysis;
  const currentTime = useScenarioStore((s) => s.currentTime);
  const [zoom, setZoom] = useState<RangeKey>("band");
  const [hover, setHover] = useState<{ body: Body; i: number; x: number; y: number; w: number }>();

  const data = useMemo(() => {
    const s = result?.series;
    if (!s) return null;
    const times = s.time.map((t) => Number(t.seconds) * 1000 + t.nanos / 1e6);
    const body = (b: Body) =>
      times.map((_, i) => ({
        az: s[b]?.azDeg[i] ?? 0,
        el: s[b]?.elDeg[i] ?? 0,
        visible: (b === "sun" ? s.sunVisible : s.earthVisible)[i] ?? false,
      }));
    return {
      times,
      sun: body("sun"),
      earth: body("earth"),
      stride: Math.max(1, Math.ceil(times.length / MAX_POINTS)),
    };
  }, [result]);

  const status = analysisStatus(analysis, "horizon");
  if (status || !result || !data) return status;

  const x = scaleLinear([0, 360], [M.left, W - M.right]);
  const y = scaleLinear([EDGE, RANGES[zoom].top], [H - M.bottom, M.top]);
  const plot = { x: M.left, y: M.top, w: W - M.left - M.right, h: H - M.top - M.bottom };
  const path = line<{ az: number; el: number }>()
    .x((p) => x(p.az))
    .y((p) => y(p.el));

  const mask = result.horizon;
  const step = mask?.azStepDeg || 0.25;
  const terrain =
    mask && mask.elevationDeg.length > 0
      ? `M${x(0)},${y(EDGE)}L${[
          ...mask.elevationDeg.map((el, k) => `${x(k * step)},${y(Math.max(el, EDGE))}`),
          `${x(360)},${y(Math.max(mask.elevationDeg[0]!, EDGE))}`,
        ].join("L")}L${x(360)},${y(EDGE)}Z`
      : "";
  const terrainMax = mask?.elevationDeg.length
    ? mask.elevationDeg.reduce((best, el, i) => (el > best.el ? { el, az: i * step } : best), {
        el: -Infinity,
        az: 0,
      })
    : undefined;
  const heightM = (mask?.observer?.terrainHeightM ?? 0) + (mask?.observer?.obsHeightM ?? 0);
  const dip = dipDeg(heightM);

  const nowMs = currentTime ? parseUtc(currentTime) : null;
  const nowIdx = nowMs !== null ? nearestIndex(data.times, nowMs) : -1;
  const segments = (b: Body) =>
    splitSegments(data[b].filter((_, i) => i % data.stride === 0 || i === data[b].length - 1));

  const m = result.metrics;
  const summary = m
    ? polarSummary({
        terrainMax,
        sunVisiblePct: m.illuminationPct,
        earthVisiblePct: m.earthVisiblePct,
        longestDarkH: m.longestDarkH,
        longestBlackoutH: m.longestCommBlackoutH,
        now:
          nowIdx >= 0 && currentTime
            ? {
                time: currentTime.slice(0, 16).replace("T", " "),
                sun: data.sun[nowIdx]!,
                earth: data.earth[nowIdx]!,
              }
            : undefined,
      })
    : "";

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    let best: { body: Body; i: number } | undefined;
    let bestD = HOVER_DIST ** 2;
    for (const b of ["sun", "earth"] as const) {
      data[b].forEach((p, i) => {
        if (p.el < EDGE || p.el > RANGES[zoom].top) return;
        const d = (x(p.az) - px) ** 2 + (y(p.el) - py) ** 2;
        if (d < bestD) [best, bestD] = [{ body: b, i }, d];
      });
    }
    setHover(best && { ...best, x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width });
  };

  const hoverPt = hover ? data[hover.body][hover.i] : undefined;

  return (
    <section aria-labelledby={`${ids}-title`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${ids}-title`} className="text-lg font-semibold">
          Unrolled horizon
        </h2>
        <div role="radiogroup" aria-label="Elevation range" className="flex gap-1 text-sm">
          {(Object.keys(RANGES) as RangeKey[]).map((k) => (
            <label
              key={k}
              className={cn(
                "flex min-h-11 cursor-pointer items-center rounded-md border px-3",
                zoom === k ? "border-earth text-text" : "border-surface text-muted",
              )}
            >
              <input
                type="radio"
                name={`${ids}-range`}
                className="sr-only"
                checked={zoom === k}
                onChange={() => setZoom(k)}
              />
              {RANGES[k].label}
            </label>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg
          role="img"
          aria-label="Unrolled horizon"
          aria-describedby={`${ids}-summary`}
          viewBox={`0 0 ${W} ${H}`}
          className={cn("block h-auto w-full touch-none", hover && "cursor-pointer")}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHover(undefined)}
          onClick={() => {
            if (!hover) return;
            useScenarioStore
              .getState()
              .setCurrentTime(new Date(data.times[hover.i]!).toISOString());
          }}
        >
          <defs>
            <clipPath id={`${ids}-clip`}>
              <rect x={plot.x} y={plot.y} width={plot.w} height={plot.h} />
            </clipPath>
          </defs>
          <rect x={plot.x} y={plot.y} width={plot.w} height={plot.h} className="fill-space" />
          {RANGES[zoom].ticks.map((el) => (
            <g key={el}>
              <line
                x1={plot.x}
                x2={plot.x + plot.w}
                y1={y(el)}
                y2={y(el)}
                className="stroke-surface"
              />
              <text
                x={plot.x - 6}
                y={y(el)}
                textAnchor="end"
                dominantBaseline="central"
                className="fill-muted font-mono text-[10px]"
              >
                {el}°
              </text>
            </g>
          ))}
          {[0, 45, 90, 135, 180, 225, 270, 315, 360].map((az) => (
            <g key={az}>
              <line
                x1={x(az)}
                x2={x(az)}
                y1={plot.y}
                y2={plot.y + plot.h}
                className="stroke-surface"
              />
              <text
                x={x(az)}
                y={H - M.bottom + 16}
                textAnchor="middle"
                className={cn(
                  "text-[10px]",
                  az % 90 === 0 ? "fill-text font-semibold" : "fill-muted",
                )}
              >
                {dirOf(az)}
              </text>
            </g>
          ))}

          <g clipPath={`url(#${ids}-clip)`}>
            {terrain && (
              <path
                data-layer="terrain"
                d={terrain}
                className="fill-surface stroke-muted"
                fillOpacity={0.85}
              />
            )}
            <line
              data-layer="zero"
              x1={plot.x}
              x2={plot.x + plot.w}
              y1={y(0)}
              y2={y(0)}
              className="stroke-text"
              strokeOpacity={0.6}
              strokeWidth={1.25}
            />
            <line
              data-layer="dip"
              x1={plot.x}
              x2={plot.x + plot.w}
              y1={y(dip)}
              y2={y(dip)}
              className="stroke-muted"
              strokeDasharray="6 4"
            />
            {(["earth", "sun"] as const).map((b) =>
              segments(b).map((seg, k) => (
                <path
                  key={`${b}-${k}`}
                  data-layer={`${b}-${seg.visible ? "visible" : "hidden"}`}
                  d={path(seg.points) ?? ""}
                  className={cn("fill-none", STROKE[b])}
                  strokeWidth={seg.visible ? 2 : 1.5}
                  strokeOpacity={seg.visible ? 1 : 0.7}
                  strokeLinecap="round"
                  strokeDasharray={seg.visible ? undefined : "1 4"}
                />
              )),
            )}
            {nowIdx >= 0 &&
              (["earth", "sun"] as const).map((b) => {
                const p = data[b][nowIdx]!;
                return (
                  <circle
                    key={b}
                    data-marker={b}
                    cx={x(p.az)}
                    cy={y(p.el)}
                    r={5}
                    className={cn(FILL[b], "stroke-space")}
                    fillOpacity={p.visible ? 1 : 0.45}
                    strokeWidth={1.5}
                  />
                );
              })}
            {hover && hoverPt && (
              <circle
                cx={x(hoverPt.az)}
                cy={y(hoverPt.el)}
                r={7}
                className={cn("fill-none", STROKE[hover.body])}
                strokeWidth={1.5}
              />
            )}
          </g>
          <text x={4} y={M.top + 4} className="fill-muted text-[10px]">
            {`dip ${f1(dip)}°`}
          </text>
        </svg>

        {hover && hoverPt && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 w-52 rounded-md border border-surface bg-panel p-3 text-xs shadow-lg"
            style={
              hover.x > hover.w / 2
                ? { right: hover.w - hover.x + 14, top: hover.y + 14 }
                : { left: hover.x + 14, top: hover.y + 14 }
            }
          >
            <p className={cn("font-semibold", hover.body === "sun" ? "text-sun" : "text-earth")}>
              {hover.body === "sun" ? "Sun" : "Earth"} · {hoverPt.visible ? "visible" : "hidden"}
            </p>
            <p className="font-mono text-muted">
              {new Date(data.times[hover.i]!).toISOString().slice(0, 16).replace("T", " ")} UTC
            </p>
            <p className="font-mono">
              az {f1(hoverPt.az)}° {dirOf(hoverPt.az)} · el {f1(hoverPt.el)}°
            </p>
            <p className="mt-1 text-muted">Click to go to this time.</p>
          </div>
        )}
      </div>
      <p id={`${ids}-summary`} className="sr-only">
        {summary}
      </p>
    </section>
  );
}
