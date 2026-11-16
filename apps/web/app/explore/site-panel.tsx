"use client";

/**
 * SitePanel — detalle rápido del sitio seleccionado en /explore (sección 12.1). Owner: Frontend 3D.
 * az/el de Sol y Tierra salen del motor (GetSeries, topocéntricos); aquí no se calculan.
 */
import { useQuery } from "@connectrpc/connect-query";
import { EphemerisService, type CatalogSite } from "@lumen/sdk";
import { keepPreviousData, skipToken } from "@tanstack/react-query";
import Link from "next/link";

import { HorizonPolar } from "@/components/horizon/horizon-polar";
import { LocalTerrainSection } from "@/components/terrain/local-terrain-section";
import { HOUR_MS, parseUtc } from "@/components/time-controls/time-math";
import { VisibilityHeatmap } from "@/components/timeline/visibility-heatmap";
import { MAX_SITES, useScenarioStore } from "@/stores/scenario-store";

import { compareHref, nextFreeColor, siteHref, type DateRange } from "./explore-links";
import { sampleAt } from "./series-at";
import { useSiteVisibility } from "./site-visibility";
import { SkyCompass } from "./sky-compass";

const OBS_HEIGHT_M = 2;
const secs = (ms: number) => ({ seconds: BigInt(Math.floor(ms / 1000)) });
const where = (el: number) => (el >= 0 ? "above the horizon" : "below the horizon");
const f1 = (n: number) => n.toFixed(1);

export function SitePanel({ site, range }: { site: CatalogSite; range: DateRange }) {
  const currentTime = useScenarioStore((s) => s.currentTime);
  const playing = useScenarioStore((s) => s.playing);
  const active = useScenarioStore((s) => s.sites);
  const { addSite, removeSite } = useScenarioStore.getState();

  const currentMs = currentTime ? parseUtc(currentTime) : null;
  const hourMs = currentMs === null ? null : Math.floor(currentMs / HOUR_MS) * HOUR_MS;
  const series = useQuery(
    EphemerisService.method.getSeries,
    hourMs === null
      ? skipToken
      : {
          site: { lat: site.lat, lon: site.lon, obsHeightM: OBS_HEIGHT_M },
          range: { start: secs(hourMs), end: secs(hourMs + 2 * HOUR_MS), stepMinutes: 30 },
        },
    { staleTime: Infinity, placeholderData: keepPreviousData },
  );
  const sample = series.data && currentMs !== null ? sampleAt(series.data, currentMs) : undefined;

  const status = useSiteVisibility(site, range);
  const chartSite = { lat: site.lat, lon: site.lon, obsHeightM: OBS_HEIGHT_M };
  const index = active.findIndex((s) => s.id === site.id);
  const color = nextFreeColor(active);
  const summary = sample
    ? `At ${site.name}: Sun at azimuth ${f1(sample.sun.az)}°, elevation ${f1(sample.sun.el)}° (${where(sample.sun.el)}). ` +
      `Earth at azimuth ${f1(sample.earth.az)}°, elevation ${f1(sample.earth.el)}° (${where(sample.earth.el)}).`
    : "";

  const link = "rounded-md border border-surface px-3 py-1 text-center hover:bg-surface";
  return (
    <section aria-label="Selected site" className="flex flex-col gap-4 text-sm">
      <header>
        <h2 className="text-lg font-semibold">{site.name}</h2>
        <p className="font-mono text-muted">
          {site.lat.toFixed(3)}, {site.lon.toFixed(3)}
          {!site.verified && (
            <span className="ml-2 font-sans text-partial">Coordinates not verified</span>
          )}
        </p>
      </header>

      {status && (
        <p>
          Terrain horizon now: Sun {status.sun ? "visible" : "not visible"}, Earth{" "}
          {status.earth ? "visible" : "not visible"}.
        </p>
      )}
      {sample ? (
        <SkyCompass sun={sample.sun} earth={sample.earth} />
      ) : (
        <p className="text-muted">
          {series.error
            ? "Could not load Sun and Earth positions."
            : "Loading Sun and Earth positions…"}
        </p>
      )}
      {/* Se anuncia solo en pausa: durante la reproducción cambiaría varias veces por segundo. */}
      <p className="sr-only" aria-live="polite">
        {playing ? "" : summary}
      </p>

      <HorizonPolar site={chartSite} range={range} />
      <VisibilityHeatmap site={chartSite} range={range} />
      <LocalTerrainSection site={chartSite} range={range} />

      {index >= 0 ? (
        <button type="button" className={link} onClick={() => removeSite(index)}>
          Remove from comparison
        </button>
      ) : (
        <>
          <button
            type="button"
            className={`${link} disabled:opacity-50 disabled:hover:bg-transparent`}
            disabled={!color}
            onClick={() =>
              color &&
              addSite({
                id: site.id,
                name: site.name,
                lat: site.lat,
                lon: site.lon,
                obsHeightM: OBS_HEIGHT_M,
                color,
              })
            }
          >
            Add to compare
          </button>
          {!color && (
            <p className="text-muted">
              Comparison holds up to {MAX_SITES} sites. Remove one first.
            </p>
          )}
        </>
      )}

      {currentTime && (
        <nav aria-label="Open in" className="flex flex-col gap-2">
          <Link className={link} href={siteHref(site, range, currentTime)}>
            Open site detail
          </Link>
          <Link className={link} href={compareHref(active, range)}>
            Compare ({active.length})
          </Link>
        </nav>
      )}
    </section>
  );
}
