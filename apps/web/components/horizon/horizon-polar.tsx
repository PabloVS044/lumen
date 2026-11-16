"use client";

/**
 * HorizonPolar — M2 Visor de horizonte. Owner: Frontend Charts (ver docs/team/ROLES.md).
 * Especificación: sección 12.2. D3 calcula escalas y trayectorias; React dibuja el SVG.
 * Datos solo del motor (AnalysisService.Analyze); `currentTime` sale del store.
 */
import { line } from "d3";
import { useMemo, useRef, useState, type MouseEvent } from "react";

import { SvgDownload } from "@/components/export/chart-download";

import { useScenarioStore } from "@/stores/scenario-store";

import {
  angularRadiusFraction,
  dipDeg,
  nearestIndex,
  nearestXY,
  polarSummary,
  radialScale,
  splitSegments,
  toXY,
  type RadialMode,
} from "./polar-math";
import { parseUtc, useAnalysis, type RangeProp, type SiteProp } from "./use-analysis";

const R = 150;
const VIEW = 360;
const SUN_DIAMETER_DEG = 0.53;
const EARTH_DIAMETER_DEG = 1.9;
const MAX_POINTS = 4000;
const RINGS = [5, 10, 15];
const CARDINALS: [string, number][] = [
  ["N", 0],
  ["E", 90],
  ["S", 180],
  ["W", 270],
];

interface Props {
  site: SiteProp;
  range: RangeProp;
}

type Body = "Sun" | "Earth";

export function HorizonPolar({ site, range }: Props) {
  const { result, queued, error, pending, invalidRange } = useAnalysis(site, range);
  const currentTime = useScenarioStore((s) => s.currentTime);
  const [mode, setMode] = useState<RadialMode>("full");
  const [realSize, setRealSize] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ body: Body; index: number }>();

  const scale = useMemo(() => radialScale(mode), [mode]);
  const px = (az: number, el: number) => {
    const p = toXY(az, scale(el) * R);
    return [p.x, p.y] as [number, number];
  };

  const data = useMemo(() => {
    const s = result?.series;
    if (!s || !s.sun || !s.earth) return undefined;
    const times = s.time.map((t) => Number(t.seconds) * 1000);
    const stride = Math.max(1, Math.ceil(times.length / MAX_POINTS));
    const body = (b: NonNullable<typeof s.sun>, horizon: number[]) =>
      times.map((_, i) => ({
        az: b.azDeg[i]!,
        el: b.elDeg[i]!,
        visible: b.elDeg[i]! >= (horizon[i] ?? 0),
      }));
    return {
      times,
      sun: body(s.sun, s.horizonAtSunDeg),
      earth: body(s.earth, s.horizonAtEarthDeg),
      stride,
    };
  }, [result]);

  if (invalidRange) return <p className="text-sm text-bad">The date range is not valid.</p>;
  if (error) {
    return (
      <p role="alert" className="text-sm text-bad">
        Could not load the horizon for this site.
      </p>
    );
  }
  if (queued)
    return <p className="text-sm text-muted">Computing the horizon… this can take a moment.</p>;
  if (pending || !result) return <p className="text-sm text-muted">Loading horizon…</p>;

  const mask = result.horizon;
  const metrics = result.metrics;
  const nowMs = currentTime ? parseUtc(currentTime) : null;
  const nowIdx = data && nowMs !== null ? nearestIndex(data.times, nowMs) : -1;

  const sunPt = nowIdx >= 0 ? data!.sun[nowIdx] : undefined;
  const earthPt = nowIdx >= 0 ? data!.earth[nowIdx] : undefined;

  // Terreno: el polígono entre el borde del gráfico y el perfil del horizonte.
  const terrain = mask
    ? mask.elevationDeg.map((el, i) => px(i * (mask.azStepDeg || 0.25), Math.max(el, -5)))
    : [];
  const terrainPath =
    terrain.length > 0
      ? `M${-R},0 A${R},${R} 0 1,0 ${R},0 A${R},${R} 0 1,0 ${-R},0 Z M${terrain.map((p) => p.join(",")).join("L")}Z`
      : "";
  const terrainMax = mask?.elevationDeg.length
    ? mask.elevationDeg.reduce(
        (best, el, i) => (el > best.el ? { el, az: i * (mask.azStepDeg || 0.25) } : best),
        { el: -Infinity, az: 0 },
      )
    : undefined;

  const path = line();
  const segments = (pts: NonNullable<typeof data>["sun"]) =>
    splitSegments(pts.filter((_, i) => i % data!.stride === 0 || i === pts.length - 1)).map(
      (seg) => ({ visible: seg.visible, d: path(seg.points.map((p) => px(p.az, p.el))) ?? "" }),
    );

  const summary =
    metrics && sunPt && earthPt && currentTime
      ? polarSummary({
          terrainMax,
          sunVisiblePct: metrics.illuminationPct,
          earthVisiblePct: metrics.earthVisiblePct,
          longestDarkH: metrics.longestDarkH,
          longestBlackoutH: metrics.longestCommBlackoutH,
          now: {
            time: currentTime.slice(0, 16).replace("T", " "),
            sun: sunPt,
            earth: earthPt,
          },
        })
      : metrics
        ? polarSummary({
            terrainMax,
            sunVisiblePct: metrics.illuminationPct,
            earthVisiblePct: metrics.earthVisiblePct,
            longestDarkH: metrics.longestDarkH,
            longestBlackoutH: metrics.longestCommBlackoutH,
          })
        : "";

  // Clic o roce sobre el gráfico: la muestra de cualquier trayectoria más cercana al puntero.
  const pick = (e: MouseEvent<SVGSVGElement>) => {
    if (!data) return undefined;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return undefined;
    const x = ((e.clientX - rect.left) / rect.width) * VIEW - VIEW / 2;
    const y = ((e.clientY - rect.top) / rect.height) * VIEW - VIEW / 2;
    const xy = (pts: typeof data.sun) =>
      pts.map((p) => {
        const [px_, py_] = px(p.az, p.el);
        return { x: px_, y: py_ };
      });
    const sIdx = nearestXY(xy(data.sun), x, y);
    const eIdx = nearestXY(xy(data.earth), x, y);
    const d = (b: typeof data.sun, i: number) => {
      const [bx, by] = px(b[i]!.az, b[i]!.el);
      return (bx - x) ** 2 + (by - y) ** 2;
    };
    if (sIdx < 0 || eIdx < 0) return undefined;
    return d(data.sun, sIdx) <= d(data.earth, eIdx)
      ? { body: "Sun" as const, index: sIdx }
      : { body: "Earth" as const, index: eIdx };
  };
  const hoverPt =
    hover && data ? data[hover.body === "Sun" ? "sun" : "earth"][hover.index] : undefined;

  const marker = (pt: { az: number; el: number } | undefined, diameter: number, cls: string) => {
    if (!pt) return null;
    const [cx, cy] = px(pt.az, pt.el);
    const r = realSize ? Math.max(3, angularRadiusFraction(scale, pt.el, diameter) * R) : 5;
    return <circle cx={cx} cy={cy} r={r} className={cls} />;
  };

  const btn = (active: boolean) =>
    `rounded-md border px-3 py-1 text-sm ${active ? "border-text bg-surface" : "border-surface hover:bg-surface"}`;

  return (
    <section aria-label="Horizon polar chart" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Chart options">
        <button
          type="button"
          className={btn(mode === "full")}
          aria-pressed={mode === "full"}
          onClick={() => setMode("full")}
        >
          Full sky
        </button>
        <button
          type="button"
          className={btn(mode === "zoom")}
          aria-pressed={mode === "zoom"}
          onClick={() => setMode("zoom")}
        >
          Zoom to 15°
        </button>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={realSize}
            onChange={(e) => setRealSize(e.target.checked)}
          />
          Real angular size
        </label>
      </div>

      <SvgDownload svgRef={svgRef} name="Horizon and Sun and Earth paths" size={800} />
      <svg
        ref={svgRef}
        role="img"
        aria-label={`Sun and Earth paths against the terrain horizon at ${site.lat.toFixed(2)}, ${site.lon.toFixed(2)}`}
        viewBox={`${-VIEW / 2} ${-VIEW / 2} ${VIEW} ${VIEW}`}
        className="mx-auto w-full max-w-md cursor-crosshair"
        onMouseMove={(e) => setHover(pick(e))}
        onMouseLeave={() => setHover(undefined)}
        onClick={(e) => {
          const hit = pick(e);
          if (hit && data)
            useScenarioStore
              .getState()
              .setCurrentTime(new Date(data.times[hit.index]!).toISOString());
        }}
      >
        <g data-layer="sky">
          <circle r={R} className="fill-space stroke-surface" />
          {RINGS.map((el) => (
            <g key={el}>
              <circle
                r={scale(el) * R}
                className="fill-none stroke-surface"
                strokeDasharray="2 4"
              />
              <text x={3} y={-scale(el) * R - 2} className="fill-muted text-[8px]">
                {el}°
              </text>
            </g>
          ))}
        </g>
        <g data-layer="terrain">
          {terrainPath && <path d={terrainPath} fillRule="evenodd" className="fill-surface" />}
        </g>
        <g data-layer="horizon-lines">
          <circle r={scale(0) * R} className="fill-none stroke-text" strokeWidth={1.5} />
          <circle
            data-layer="dip"
            r={scale(dipDeg(site.obsHeightM || 2)) * R}
            className="fill-none stroke-muted"
            strokeDasharray="1 3"
          />
        </g>
        <g data-layer="cardinals">
          {CARDINALS.map(([label, az]) => {
            const p = toXY(az, R + 12);
            return (
              <text
                key={label}
                x={p.x}
                y={p.y + 3}
                textAnchor="middle"
                className="fill-text text-[11px] font-semibold"
              >
                {label}
              </text>
            );
          })}
        </g>
        {data && (
          <>
            <g data-layer="sun-path" className="stroke-sun" fill="none">
              {segments(data.sun).map((s, i) => (
                <path
                  key={i}
                  d={s.d}
                  data-visible={s.visible}
                  strokeWidth={s.visible ? 2 : 1.5}
                  strokeDasharray={s.visible ? undefined : "3 4"}
                  opacity={s.visible ? 1 : 0.7}
                />
              ))}
            </g>
            <g data-layer="earth-path" className="stroke-earth" fill="none">
              {segments(data.earth).map((s, i) => (
                <path
                  key={i}
                  d={s.d}
                  data-visible={s.visible}
                  strokeWidth={s.visible ? 2 : 1.5}
                  strokeDasharray={s.visible ? undefined : "3 4"}
                  opacity={s.visible ? 1 : 0.7}
                />
              ))}
            </g>
            <g data-layer="now">
              {marker(sunPt, SUN_DIAMETER_DEG, "fill-sun stroke-space")}
              {marker(earthPt, EARTH_DIAMETER_DEG, "fill-earth stroke-space")}
            </g>
            {hoverPt && (
              <circle
                cx={px(hoverPt.az, hoverPt.el)[0]}
                cy={px(hoverPt.az, hoverPt.el)[1]}
                r={4}
                className="fill-none stroke-text"
              />
            )}
          </>
        )}
      </svg>

      <p aria-live="off" className="min-h-5 font-mono text-sm text-muted">
        {hover && hoverPt && data
          ? `${hover.body}: azimuth ${hoverPt.az.toFixed(1)}°, elevation ${hoverPt.el.toFixed(1)}° at ${new Date(data.times[hover.index]!).toISOString().slice(0, 16).replace("T", " ")} UTC`
          : ""}
      </p>
      <ul className="flex flex-wrap gap-4 text-sm text-muted">
        <li className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-0.5 w-5 bg-sun" />
          Sun (dotted = below the terrain)
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-0.5 w-5 bg-earth" />
          Earth (dotted = below the terrain)
        </li>
        <li>Solid ring: 0°. Dotted ring: geometric horizon (dip).</li>
      </ul>
      <p className="text-sm">{summary}</p>
    </section>
  );
}
