"use client";

/**
 * Globe — M4 Globo 3D. Owner: Frontend 3D (ver docs/team/ROLES.md).
 * Especificación: sección 12.2 del documento técnico.
 * Sin token de ion o sin asset ID de Cesium Moon: esfera simple y aviso.
 */
import { useQuery } from "@connectrpc/connect-query";
import { SiteService, type CatalogSite } from "@lumen/sdk";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { Cartesian3, Ellipsoid, IonResource } from "cesium";
import { useMemo, useState } from "react";
import { Cesium3DTileset, EllipsoidGraphics, Entity, Globe as CesiumGlobe, Viewer } from "resium";

import { useScenarioStore } from "@/stores/scenario-store";

import { CameraController } from "./camera-controller";
import { createDayNightShader } from "./moon-shader";
import { SiteMarkers, type SiteStatus } from "./site-markers";
import { SkyOverlay } from "./sky-overlay";
import { tokenColor } from "./token-color";
import { useSunEarth } from "./use-sun-earth";

interface GlobeProps {
  selectedSiteId?: string;
  /** Sol y Tierra visibles desde el sitio seleccionado (horizonte real, del motor). */
  selectedStatus?: SiteStatus;
  onSelectSite?: (site: CatalogSite) => void;
}

export function Globe({ selectedSiteId, selectedStatus, onSelectSite }: GlobeProps = {}) {
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
  // Con el tileset cargado se puede muestrear su altura (las alturas del motor no valen en la escena).
  const [tilesReady, setTilesReady] = useState(false);
  const dayNight = useMemo(() => createDayNightShader(), []);
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
        baseLayer={false}
        geocoder={false}
        baseLayerPicker={false}
        sceneModePicker={false}
        homeButton={false}
        navigationHelpButton={false}
        animation={false}
        timeline={false}
        fullscreenButton={false}
      >
        {/* Resium 1.28 exige scene.globe: se deja uno oculto y sin capas en vez de globe={false}. */}
        <CesiumGlobe show={false} />
        <CameraController target={selectedSite} />
        {moonTiles ? (
          <Cesium3DTileset
            url={moonTiles}
            customShader={sun ? dayNight : undefined}
            onReady={() => setTilesReady(true)}
          />
        ) : (
          <Entity position={Cartesian3.ZERO}>
            <EllipsoidGraphics
              radii={Ellipsoid.MOON.radii}
              material={tokenColor("--color-surface")}
            />
          </Entity>
        )}
        <SkyOverlay
          shader={dayNight}
          sun={sun}
          earth={earth}
          site={selectedSite}
          tilesReady={tilesReady}
        />
        {catalog && (
          <SiteMarkers
            sites={catalog.sites}
            selectedId={selectedSiteId}
            selectedStatus={selectedStatus}
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
      {moonTiles && sun && (
        <p className="pointer-events-none absolute top-3 right-3 max-w-xs rounded-sm bg-panel/80 px-2 py-1 text-xs text-muted">
          Globe shading is approximate and ignores terrain relief. Real visibility is in the side
          panel.
        </p>
      )}
      {moonTiles && (
        <p className="pointer-events-none absolute right-3 bottom-2 rounded-sm bg-panel/80 px-2 py-1 text-xs text-muted">
          Moon terrain and imagery: NASA and the USGS Astrogeology Science Center, via Cesium ion.
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
