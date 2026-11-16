"use client";

/**
 * SkyOverlay — luz solar real, terminador, puntos subsolar/sub-Tierra y flecha a la Tierra
 * (M4, sección 9.11). Owner: Frontend 3D. Va dentro del Viewer; los vectores llegan en MOON_ME.
 */
import type { CatalogSite } from "@lumen/sdk";
import {
  ArcType,
  Cartesian2,
  Cartesian3,
  DirectionalLight,
  Ellipsoid,
  PolylineArrowMaterialProperty,
  type CustomShader,
  type Scene,
} from "cesium";
import { useEffect, useMemo } from "react";
import { Entity, useCesium } from "resium";

import { subpoint, terminatorRing, type Vec3 } from "./lighting";
import { setSunDirection } from "./moon-shader";
import { tokenColor } from "./token-color";

const TERMINATOR_ALT_M = 5_000;
const ARROW_LENGTH_M = 300_000;

interface Props {
  /** Sombreado día/noche del tileset: se actualiza con el Sol. */
  shader?: CustomShader;
  sun?: Vec3;
  earth?: Vec3;
  site?: CatalogSite;
}

// La luz viaja del Sol hacia la Luna; el globo está fijo en MOON_ME.
function lightScene(scene: Scene, sun: Vec3) {
  scene.light = new DirectionalLight({ direction: new Cartesian3(-sun.x, -sun.y, -sun.z) });
  scene.requestRender();
}

export function SkyOverlay({ shader, sun, earth, site }: Props) {
  const { scene } = useCesium();

  useEffect(() => {
    if (!scene || !sun) return;
    lightScene(scene, sun);
    if (shader) setSunDirection(shader, sun);
  }, [scene, sun, shader]);

  const ring = useMemo(
    () =>
      sun
        ? terminatorRing(sun, Ellipsoid.MOON.maximumRadius + TERMINATOR_ALT_M).map(
            (p) => new Cartesian3(p.x, p.y, p.z),
          )
        : null,
    [sun],
  );

  const sunColor = tokenColor("--color-sun");
  const earthColor = tokenColor("--color-earth");
  const marker = (dir: Vec3, text: string, color: typeof sunColor) => {
    const { latDeg, lonDeg } = subpoint(dir);
    return (
      <Entity
        id={`sub-${text.toLowerCase()}`}
        position={Cartesian3.fromDegrees(lonDeg, latDeg, 0, Ellipsoid.MOON)}
        point={{ pixelSize: 12, color }}
        label={{
          text,
          font: "13px sans-serif",
          fillColor: color,
          pixelOffset: new Cartesian2(0, -18),
        }}
      />
    );
  };

  const sitePos = site ? Cartesian3.fromDegrees(site.lon, site.lat, 0, Ellipsoid.MOON) : null;
  const arrowEnd =
    sitePos && earth
      ? new Cartesian3(
          sitePos.x + earth.x * ARROW_LENGTH_M,
          sitePos.y + earth.y * ARROW_LENGTH_M,
          sitePos.z + earth.z * ARROW_LENGTH_M,
        )
      : null;

  return (
    <>
      {ring && (
        <Entity
          id="terminator"
          polyline={{
            positions: ring,
            width: 2,
            arcType: ArcType.NONE,
            material: sunColor,
            depthFailMaterial: sunColor,
          }}
        />
      )}
      {sun && marker(sun, "Sun", sunColor)}
      {earth && marker(earth, "Earth", earthColor)}
      {sitePos && arrowEnd && (
        <Entity
          id="earth-arrow"
          polyline={{
            positions: [sitePos, arrowEnd],
            width: 8,
            arcType: ArcType.NONE,
            material: new PolylineArrowMaterialProperty(earthColor),
          }}
        />
      )}
    </>
  );
}
