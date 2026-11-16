"use client";

/**
 * Gráficos del sitio de /site, con el sitio y el rango tomados de la URL (sección 12.3):
 * /site?lat&lon&h&start&end. Owner: Frontend Charts.
 */
import { useQueryStates } from "nuqs";
import { Suspense } from "react";

import { HorizonPolar } from "@/components/horizon/horizon-polar";
import { SiteExport } from "@/components/export/site-export";
import { PowerSimulator } from "@/components/power/power-simulator";
import { CopyLinkButton } from "@/components/share/copy-link-button";
import { LocalTerrainSection } from "@/components/terrain/local-terrain-section";
import { VisibilityHeatmap } from "@/components/timeline/visibility-heatmap";
import { WhatIfChart } from "@/components/whatif/what-if-chart";
import { siteSearchParams } from "@/lib/url-state";
import { useUrlTimeSync } from "@/lib/use-url-time";

function Charts() {
  const [{ lat, lon, h, start, end }] = useQueryStates(siteSearchParams);
  useUrlTimeSync();
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
      <CopyLinkButton />
      <SiteExport site={site} range={range} />
      <HorizonPolar site={site} range={range} />
      <VisibilityHeatmap site={site} range={range} />
      <LocalTerrainSection site={site} range={range} />
      <PowerSimulator site={site} range={range} />
      <WhatIfChart site={site} range={range} />
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
