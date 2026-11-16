"use client";

/**
 * ExploreView — /explore: globo a pantalla completa + panel lateral (sección 12.1). Owner: Frontend 3D.
 * El sitio seleccionado es estado local; los sitios a comparar viven en el store.
 */
import { useQuery } from "@connectrpc/connect-query";
import { SiteService, type CatalogSite } from "@lumen/sdk";
import { useQueryState } from "nuqs";
import { useState } from "react";

import { GlobeLoader } from "@/components/globe/globe-loader";
import { SitePicker } from "@/components/site-picker/site-picker";
import { TimeControls } from "@/components/time-controls/time-controls";
import { resolveWindow } from "@/components/time-controls/time-math";
import { siteSearchParams } from "@/lib/url-state";
import { useScenarioStore } from "@/stores/scenario-store";

import { rangeOf } from "./explore-links";
import { SitePanel } from "./site-panel";
import { useSiteVisibility } from "./site-visibility";

export function ExploreView() {
  const [selected, setSelected] = useState<CatalogSite>();
  const [start] = useQueryState("start", siteSearchParams.start);
  const [end] = useQueryState("end", siteSearchParams.end);
  const [t] = useQueryState("t", siteSearchParams.t);
  const currentTime = useScenarioStore((s) => s.currentTime);
  const catalog = useQuery(SiteService.method.listSites, {});

  // Mismo rango que usa TimeControls; sin start ni t en la URL arranca en la hora actual del reloj.
  const anchor = t ?? currentTime;
  const range = start || anchor ? rangeOf(resolveWindow({ start, end, t: anchor }, 0)) : null;

  const status = useSiteVisibility(selected, range);

  return (
    <div className="flex flex-1 flex-col lg:h-[calc(100dvh-3.8rem)] lg:flex-none lg:flex-row">
      <h1 className="sr-only">Explore</h1>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative min-h-[28rem] flex-1">
          <div className="absolute inset-0">
            <GlobeLoader
              selectedSiteId={selected?.id}
              selectedStatus={status}
              onSelectSite={setSelected}
            />
          </div>
        </div>
        <div className="border-t border-surface p-3">
          <TimeControls site={selected} />
        </div>
      </div>
      <aside
        aria-label="Site detail"
        className="flex w-full shrink-0 flex-col gap-4 border-t border-surface bg-panel p-4 lg:w-96 lg:overflow-y-auto lg:border-t-0 lg:border-l"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Site</span>
          <select
            className="rounded-md border border-surface bg-space px-2 py-2"
            value={selected?.id ?? ""}
            onChange={(e) => setSelected(catalog.data?.sites.find((s) => s.id === e.target.value))}
          >
            <option value="">Select a site…</option>
            {catalog.data?.sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        {selected && range ? (
          <SitePanel site={selected} range={range} />
        ) : (
          <p className="text-sm text-muted">
            Select a site on the globe or from the list to see its detail.
          </p>
        )}
        <SitePicker />
      </aside>
    </div>
  );
}
