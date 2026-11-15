"use client";

/**
 * Globe — M4 Globo 3D. Owner: Frontend 3D (ver docs/team/ROLES.md).
 * Especificación: sección 12.2 del documento técnico.
 * Sin token de ion o sin asset ID de Cesium Moon: esfera simple y aviso.
 */
import { useQuery } from "@connectrpc/connect-query";
import { SiteService, type CatalogSite } from "@lumen/sdk";
import { Cartesian3, Ellipsoid, IonResource } from "cesium";
import { useMemo } from "react";
import { Cesium3DTileset, EllipsoidGraphics, Entity, Viewer } from "resium";

import { useScenarioStore } from "@/stores/scenario-store";

import { SiteMarkers } from "./site-markers";
import { SkyOverlay } from "./sky-overlay";
import { tokenColor } from "./token-color";
import { useSunEarth } from "./use-sun-earth";

interface GlobeProps {
  selectedSiteId?: string;
  onSelectSite?: (site: CatalogSite) => void;
}

export function Globe({ selectedSiteId, onSelectSite }: GlobeProps = {}) {
  const { data: catalog, error: catalogError } = useQuery(SiteService.method.listSites, {});
  const currentTime = useScenarioStore((s) => s.currentTime);
  const { sun, earth, error: stateError } = useSunEarth(currentTime);
  const selectedSite = catalog?.sites.find((x) => x.id === selectedSiteId);
  const ionToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
  const assetId = Number.parseInt(process.env.NEXT_PUBLIC_CESIUM_MOON_ASSET_ID ?? "", 10);
  const missing = !ionToken
    ? "Cesium ion token"
    : Number.isNaN(assetId)
      ? "Cesium Moon asset ID"
      : null;
  const moonTiles = useMemo(
    () => (missing ? null : IonResource.fromAssetId(assetId, { accessToken: ionToken })),
    [missing, assetId, ionToken],
  );

  return (
    <section aria-label="Globe" className="relative h-full min-h-96 w-full">
      <Viewer
        className="h-full w-full"
        ellipsoid={Ellipsoid.MOON}
        requestRenderMode
        globe={false}
        geocoder={false}
        baseLayerPicker={false}
        sceneModePicker={false}
        homeButton={false}
        navigationHelpButton={false}
        animation={false}
        timeline={false}
        fullscreenButton={false}
      >
        {moonTiles ? (
          <Cesium3DTileset url={moonTiles} />
        ) : (
          <Entity position={Cartesian3.ZERO}>
            <EllipsoidGraphics
              radii={Ellipsoid.MOON.radii}
              material={tokenColor("--color-surface")}
            />
          </Entity>
        )}
        <SkyOverlay sun={sun} earth={earth} site={selectedSite} />
        {catalog && (
          <SiteMarkers
            sites={catalog.sites}
            selectedId={selectedSiteId}
            onSelect={(site) => onSelectSite?.(site)}
          />
        )}
      </Viewer>
      {catalogError && (
        <p
          role="alert"
          className="absolute bottom-3 left-3 max-w-sm rounded-md bg-panel px-3 py-2 text-sm text-bad"
        >
          Could not load the site catalog. Markers are hidden.
        </p>
      )}
      {stateError && (
        <p
          role="alert"
          className="absolute bottom-14 left-3 max-w-sm rounded-md bg-panel px-3 py-2 text-sm text-bad"
        >
          Could not load the Sun and Earth positions. Lighting may be out of date.
        </p>
      )}
      {missing && (
        <p
          role="status"
          className="absolute left-3 top-3 max-w-sm rounded-md bg-panel px-3 py-2 text-sm text-partial"
        >
          {missing} is missing. Showing a plain sphere instead of the Moon terrain.
        </p>
      )}
    </section>
  );
}
