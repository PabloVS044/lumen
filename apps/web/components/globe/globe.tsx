"use client";

/**
 * Globe — M4 Globo 3D. Owner: Frontend 3D (ver docs/team/ROLES.md).
 * Especificación: sección 12.2 del documento técnico.
 * Sin token de ion o sin asset ID de Cesium Moon: esfera simple y aviso.
 */
import "cesium/Build/Cesium/Widgets/widgets.css";
import { Cartesian3, Color, Ellipsoid, IonResource } from "cesium";
import { useMemo } from "react";
import { Cesium3DTileset, EllipsoidGraphics, Entity, Globe as CesiumGlobe, Viewer } from "resium";

export function Globe() {
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
        {moonTiles ? (
          <Cesium3DTileset url={moonTiles} />
        ) : (
          <Entity position={Cartesian3.ZERO}>
            <EllipsoidGraphics
              radii={Ellipsoid.MOON.radii}
              material={Color.fromCssColorString(
                getComputedStyle(document.documentElement)
                  .getPropertyValue("--color-surface")
                  .trim(),
              )}
            />
          </Entity>
        )}
      </Viewer>
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
