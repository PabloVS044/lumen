"use client";

/**
 * GroundView — tileset de Cesium Moon con la cámara a ras de suelo en el sitio (M10). Owner: Frontend 3D.
 * Solo imagen de fondo: el horizonte y la sombra que se dibujan encima vienen del motor, no del tileset.
 */
import "cesium/Build/Cesium/Widgets/widgets.css";
import { Cartesian3, Ellipsoid, IonResource, Math as CesiumMath, type Camera } from "cesium";
import { useEffect, useMemo } from "react";
import { Cesium3DTileset, Globe, Viewer, useCesium } from "resium";

interface Props {
  lat: number;
  lon: number;
  /** Altura de la cámara sobre la esfera lunar, en metros. */
  heightM: number;
  heading: number;
  fovDeg: number;
}

function aim(camera: Camera, p: Props) {
  // PerspectiveFrustum.fov es el FOV horizontal si el canvas es más ancho que alto.
  (camera.frustum as { fov: number }).fov = CesiumMath.toRadians(p.fovDeg);
  camera.setView({
    destination: Cartesian3.fromDegrees(p.lon, p.lat, p.heightM, Ellipsoid.MOON),
    orientation: { heading: CesiumMath.toRadians(p.heading), pitch: 0, roll: 0 },
  });
}

function GroundCamera(props: Props) {
  const { camera, scene } = useCesium();
  const { lat, lon, heightM, heading, fovDeg } = props;
  useEffect(() => {
    if (!camera) return;
    aim(camera, { lat, lon, heightM, heading, fovDeg });
    scene?.requestRender();
  }, [camera, scene, lat, lon, heightM, heading, fovDeg]);
  return null;
}

export function GroundView(props: Props) {
  const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
  const assetId = Number.parseInt(process.env.NEXT_PUBLIC_CESIUM_MOON_ASSET_ID ?? "", 10);
  const tiles = useMemo(
    () =>
      token && !Number.isNaN(assetId)
        ? IonResource.fromAssetId(assetId, { accessToken: token })
        : null,
    [token, assetId],
  );
  return (
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
      <Globe show={false} />
      {tiles && <Cesium3DTileset url={tiles} />}
      <GroundCamera {...props} />
    </Viewer>
  );
}
