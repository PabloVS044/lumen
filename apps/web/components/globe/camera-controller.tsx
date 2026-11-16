"use client";

/**
 * CameraController — cámara del globo (M4). Owner: Frontend 3D. Va dentro del Viewer.
 * Arranca mirando el polo sur (el foco del reto) y vuela al sitio que se selecciona.
 */
import {
  BoundingSphere,
  Cartesian3,
  Ellipsoid,
  HeadingPitchRange,
  Math as CesiumMath,
} from "cesium";
import { useEffect } from "react";
import { useCesium } from "resium";

const POLE_ALTITUDE_M = 3_500_000; // ~2 radios lunares desde el centro
const SITE_RANGE_M = 150_000;
const FLY_SECONDS = 2;

interface Props {
  target?: { lat: number; lon: number };
}

export function CameraController({ target }: Props) {
  const { camera } = useCesium();
  const lat = target?.lat;
  const lon = target?.lon;

  useEffect(() => {
    camera?.setView({
      destination: Cartesian3.fromDegrees(0, -90, POLE_ALTITUDE_M, Ellipsoid.MOON),
      orientation: { heading: 0, pitch: CesiumMath.toRadians(-90), roll: 0 },
    });
  }, [camera]);

  useEffect(() => {
    if (!camera || lat === undefined || lon === undefined) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    camera.flyToBoundingSphere(
      new BoundingSphere(Cartesian3.fromDegrees(lon, lat, 0, Ellipsoid.MOON), 0),
      {
        duration: reduceMotion ? 0 : FLY_SECONDS,
        offset: new HeadingPitchRange(0, CesiumMath.toRadians(-90), SITE_RANGE_M),
      },
    );
  }, [camera, lat, lon]);

  return null;
}
