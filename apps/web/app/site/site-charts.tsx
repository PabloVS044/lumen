"use client";

/**
 * Gráficos del sitio de /site, con el sitio y el rango tomados de la URL (sección 12.3):
 * /site?lat&lon&h&start&end. Owner: Frontend Charts.
 */
import { useQueryStates } from "nuqs";
import { Suspense } from "react";

import { HorizonPolar } from "@/components/horizon/horizon-polar";
import { PowerSimulator } from "@/components/power/power-simulator";
import { LocalTerrainSection } from "@/components/terrain/local-terrain-section";
import { VisibilityHeatmap } from "@/components/timeline/visibility-heatmap";
import { siteSearchParams } from "@/lib/url-state";

function Charts() {
  const [{ lat, lon, h, start, end }] = useQueryStates(siteSearchParams);
  if (lat === null || lon === null || !start || !end) {
    return (
      <p className="text-sm text-muted">
        Choose a site and a date range to see its horizon and timeline. Open one from the explorer,
        or add lat, lon, start and end to the URL.
      </p>
    );
  }
  const site = { lat, lon, obsHeightM: h };
  const range = { start, end };
  return (
    <>
      <HorizonPolar site={site} range={range} />
      <VisibilityHeatmap site={site} range={range} />
      <LocalTerrainSection site={site} range={range} />
      <PowerSimulator site={site} range={range} />
    </>
  );
}

export function SiteCharts() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading charts…</p>}>
      <Charts />
    </Suspense>
  );
}
