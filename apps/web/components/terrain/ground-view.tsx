"use client";

/**
 * GroundView — tileset de Cesium Moon con la cámara a ras de suelo en el sitio (M10). Owner: Frontend 3D.
 * Solo imagen de fondo: el horizonte y la sombra que se dibujan encima vienen del motor, no del tileset.
 */
import "cesium/Build/Cesium/Widgets/widgets.css";
import { Cartesian3, Ellipsoid, IonResource, Math as CesiumMath, type Camera } from "cesium";
import { useEffect, useMemo, useState } from "react";
import { Cesium3DTileset, Globe, Viewer, useCesium } from "resium";

import { useTilesetHeight } from "@/components/globe/use-tileset-height";

interface Props {
  lat: number;
  lon: number;
  /** Altura del observador sobre el terreno, en metros. La del terreno se mide en el propio tileset. */
  observerHeightM: number;
  heading: number;
  fovDeg: number;
}

interface AimProps extends Omit<Props, "observerHeightM"> {
  /** Altura de la cámara sobre la esfera lunar: altura del tileset en el punto + altura del observador. */
  heightM: number;
}

function aim(camera: Camera, p: AimProps) {
  // PerspectiveFrustum.fov es el FOV horizontal si el canvas es más ancho que alto.
  (camera.frustum as { fov: number }).fov = CesiumMath.toRadians(p.fovDeg);
  camera.setView({
    destination: Cartesian3.fromDegrees(p.lon, p.lat, p.heightM, Ellipsoid.MOON),
    orientation: { heading: CesiumMath.toRadians(p.heading), pitch: 0, roll: 0 },
  });
}

function GroundCamera({ tilesReady, ...props }: Props & { tilesReady: boolean }) {
  const { camera, scene } = useCesium();
  const { lat, lon, observerHeightM, heading, fovDeg } = props;
  // ⚠️ El tileset está ~659 m sobre el DEM del motor (causa sin determinar): la cámara se ubica con la
  // altura del propio tileset, no con terrain_height_m / HorizonMask.observer. El horizonte, el Sol y la
  // Tierra que se dibujan encima salen del motor en ángulos (az/el), que no dependen de la altura absoluta.
  const surfaceM = useTilesetHeight(scene, tilesReady, { lat, lon });
  useEffect(() => {
    if (!camera || surfaceM === undefined) return;
    aim(camera, { lat, lon, heightM: surfaceM + observerHeightM, heading, fovDeg });
    scene?.requestRender();
  }, [camera, scene, lat, lon, surfaceM, observerHeightM, heading, fovDeg]);
  return null;
}

export function GroundView(props: Props) {
  const [tilesReady, setTilesReady] = useState(false);
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
      {tiles && <Cesium3DTileset url={tiles} onReady={() => setTilesReady(true)} />}
      <GroundCamera {...props} tilesReady={tilesReady} />
    </Viewer>
  );
}
