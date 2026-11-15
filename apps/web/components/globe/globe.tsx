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

import { SiteMarkers } from "./site-markers";
import { tokenColor } from "./token-color";

interface GlobeProps {
  selectedSiteId?: string;
  onSelectSite?: (site: CatalogSite) => void;
}

export function Globe({ selectedSiteId, onSelectSite }: GlobeProps = {}) {
  const { data: catalog, error: catalogError } = useQuery(SiteService.method.listSites, {});
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
    <section aria-label="Globe" className="relative h-[70vh] min-h-96 w-full">
      <Viewer
        className="h-full w-full"
        ellipsoid={Ellipsoid.MOON}
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
