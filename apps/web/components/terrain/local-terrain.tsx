"use client";

/**
 * LocalTerrain — M10 Terreno local: vista a ras de suelo desde el sitio (sección 12.2). Owner: Frontend 3D.
 * El horizonte, la sombra y la posición del Sol y la Tierra salen del motor (Analyze: máscara de
 * horizonte y az/el topocéntricos), no del relieve del tileset. El tileset de Cesium Moon es solo
 * una imagen de fondo opcional.
 *
 * ⚠️ El tileset está ~659 m sobre el DEM del motor (causa sin determinar; marco horizontal ME confirmado por
 * R3). Por eso la cámara a ras de suelo se ubica con la altura del propio tileset en el sitio más la altura
 * del observador, nunca con `HorizonMask.observer`. Los ángulos (az/el) del motor no dependen de esa altura.
 */
import dynamic from "next/dynamic";
import { useId, useMemo, useState } from "react";

import { nearestIndex } from "@/components/horizon/polar-math";
import {
  parseUtc,
  useAnalysis,
  type RangeProp,
  type SiteProp,
} from "@/components/horizon/use-analysis";
import { useScenarioStore } from "@/stores/scenario-store";

import {
  discRadiusPx,
  horizonProfile,
  panoramaSummary,
  project,
  viewHorizonRange,
  type View,
} from "./panorama-math";

const GroundView = dynamic(
  () => {
    (window as unknown as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = "/cesium";
    return import("./ground-view").then((m) => m.GroundView);
  },
  { ssr: false, loading: () => null },
);

const W = 640;
const H = 280;
const FOV_DEG = 60;
const SUN_DIAMETER_DEG = 0.53;
const EARTH_DIAMETER_DEG = 1.9;
const MIN_DISC_PX = 5; // el Sol real mide ~2 px a 60° de FOV: se agranda para poder verlo
const AZ_TICKS = Array.from({ length: 12 }, (_, i) => i * 30);
const CARDINAL: Record<number, string> = { 0: "N", 90: "E", 180: "S", 270: "W" };

const norm360 = (d: number) => ((d % 360) + 360) % 360;

interface Props {
  site: SiteProp;
  range: RangeProp;
}

interface Body {
  az: number;
  el: number;
  visible: boolean;
}

export function LocalTerrain({ site, range }: Props) {
  const clipId = useId();
  const { result, queued, error, pending, invalidRange } = useAnalysis(site, range);
  const currentTime = useScenarioStore((s) => s.currentTime);
  const [heading, setHeading] = useState<number | null>(null);
  const [wantTiles, setWantTiles] = useState(true);

  const tilesAvailable = Boolean(
    process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN && process.env.NEXT_PUBLIC_CESIUM_MOON_ASSET_ID,
  );
  const showTiles = wantTiles && tilesAvailable;

  const now = useMemo(() => {
    const s = result?.series;
    const ms = currentTime ? parseUtc(currentTime) : null;
    if (!s || !s.sun || !s.earth || ms === null) return undefined;
    const i = nearestIndex(
      s.time.map((t) => Number(t.seconds) * 1000),
      ms,
    );
    if (i < 0) return undefined;
    const body = (b: NonNullable<typeof s.sun>, visible: boolean[]): Body => ({
      az: b.azDeg[i]!,
      el: b.elDeg[i]!,
      visible: visible[i] ?? false,
    });
    return { sun: body(s.sun, s.sunVisible), earth: body(s.earth, s.earthVisible) };
  }, [result, currentTime]);

  if (invalidRange) return <p className="text-sm text-bad">The date range is not valid.</p>;
  if (error) {
    return (
      <p role="alert" className="text-sm text-bad">
        Could not load the horizon for the local view.
      </p>
    );
  }
  if (queued) {
    return <p className="text-sm text-muted">Computing the horizon… this can take a moment.</p>;
  }
  const mask = result?.horizon;
  if (pending || !result || !mask) {
    return <p className="text-sm text-muted">Loading local view…</p>;
  }

  const effectiveHeading = norm360(heading ?? now?.sun.az ?? now?.earth.az ?? 0);
  const view: View = { heading: effectiveHeading, fovDeg: FOV_DEG, width: W, height: H };
  const profile = horizonProfile(mask, view);
  const pts = profile.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  const skyPath = `M0,0 L${W},0 L${[...pts].reverse().join(" L")} Z`;
  const groundPath = `M0,${H} L${pts.join(" L")} L${W},${H} Z`;
  const horizonRange = viewHorizonRange(mask, view);
  const sunHidden = now ? !now.sun.visible : false;

  const disc = (b: Body, diameter: number, cls: string, label: string) => {
    const p = project(b, view);
    if (!p.inFront || p.x < -20 || p.x > W + 20) return null;
    const r = Math.max(MIN_DISC_PX, discRadiusPx(diameter, view));
    return (
      <g data-body={label.toLowerCase()}>
        <circle cx={p.x} cy={p.y} r={r} className={cls} />
        <text x={p.x} y={p.y - r - 4} textAnchor="middle" className="fill-text text-[10px]">
          {label}
        </text>
      </g>
    );
  };

  const btn = "rounded-md border border-surface px-3 py-1 text-sm hover:bg-surface";
  const shownHeading = Math.round(effectiveHeading);
  return (
    <section aria-label="Local terrain view" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="View options">
        <button
          type="button"
          className={btn}
          onClick={() => now && setHeading(now.sun.az)}
          disabled={!now}
        >
          Face the Sun
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => now && setHeading(now.earth.az)}
          disabled={!now}
        >
          Face the Earth
        </button>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showTiles}
            disabled={!tilesAvailable}
            onChange={(e) => setWantTiles(e.target.checked)}
          />
          Moon terrain imagery (Cesium Moon)
        </label>
      </div>
      {!tilesAvailable && (
        <p className="text-sm text-muted">
          No Cesium ion token or Moon asset ID: showing the engine horizon only.
        </p>
      )}
      <label className="flex items-center gap-3 text-sm">
        <span className="text-muted">Direction (azimuth)</span>
        <input
          type="range"
          className="flex-1"
          min={0}
          max={359}
          step={1}
          value={shownHeading % 360}
          aria-valuetext={`${shownHeading} degrees`}
          onChange={(e) => setHeading(Number(e.target.value))}
        />
        <span className="w-12 font-mono">{shownHeading}°</span>
      </label>

      <div className="relative aspect-[640/280] w-full overflow-hidden rounded-md border border-surface bg-space">
        {showTiles && (
          <div className="absolute inset-0">
            <GroundView
              lat={site.lat}
              lon={site.lon}
              observerHeightM={site.obsHeightM || 2}
              heading={effectiveHeading}
              fovDeg={FOV_DEG}
            />
          </div>
        )}
        <svg
          role="img"
          aria-label="Horizon from the site with the Sun and the Earth, from the engine"
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 h-full w-full"
          data-sun-visible={now ? String(now.sun.visible) : undefined}
        >
          <defs>
            <clipPath id={clipId}>
              <path d={skyPath} />
            </clipPath>
          </defs>
          {!showTiles && <path data-layer="terrain" d={groundPath} className="fill-surface" />}
          <line
            x1={0}
            x2={W}
            y1={H / 2}
            y2={H / 2}
            className="stroke-muted"
            strokeDasharray="2 4"
          />
          <text x={4} y={H / 2 - 3} className="fill-muted text-[9px]">
            0°
          </text>
          <g clipPath={`url(#${clipId})`} data-layer="sky-bodies">
            {now && disc(now.sun, SUN_DIAMETER_DEG, "fill-sun", "Sun")}
            {now && disc(now.earth, EARTH_DIAMETER_DEG, "fill-earth", "Earth")}
          </g>
          <polyline
            data-layer="engine-horizon"
            points={pts.join(" ")}
            fill="none"
            className="stroke-text"
            strokeWidth={2}
          />
          <g data-layer="azimuth-scale">
            {AZ_TICKS.map((az) => {
              const p = project({ az, el: 0 }, view);
              if (!p.inFront || p.x < 8 || p.x > W - 8) return null;
              return (
                <text
                  key={az}
                  x={p.x}
                  y={H - 6}
                  textAnchor="middle"
                  className="fill-text text-[10px]"
                >
                  {CARDINAL[az] ?? `${az}°`}
                </text>
              );
            })}
          </g>
          {sunHidden && (
            <g data-layer="shadow">
              <rect width={W} height={H} className="fill-space" opacity={0.55} />
              <text
                x={W / 2}
                y={28}
                textAnchor="middle"
                className="fill-text text-[13px] font-semibold"
              >
                In shadow: the Sun is below the terrain horizon
              </text>
            </g>
          )}
        </svg>
      </div>

      <p className="text-sm text-muted">
        The horizon, the shadow and the positions of the Sun and the Earth come from the engine, not
        from the terrain imagery.
        {showTiles &&
          " Moon terrain imagery: NASA and the USGS Astrogeology Science Center, via Cesium ion."}
      </p>
      <p className="text-sm">
        {panoramaSummary({
          heading: effectiveHeading,
          horizon: horizonRange,
          now:
            now && currentTime
              ? { time: currentTime.slice(0, 16).replace("T", " "), ...now }
              : undefined,
        })}
      </p>
    </section>
  );
}
