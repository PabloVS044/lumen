"use client";

/**
 * Altura del propio tileset de Cesium Moon en un punto (M4, M10). Owner: Frontend 3D.
 *
 * ⚠️ El tileset está ~659 m por encima del DEM LOLA del motor en todos los puntos (R3: A +658.8 ± 5.6 m,
 * B +659.1 ± 2.6 m; en el polo 1949.9 m frente a 1290.8 m). Causa sin determinar (¿radio de referencia
 * distinto?). Regla: nunca mezclar alturas absolutas del tileset con las del motor (`terrain_height_m`,
 * `HorizonMask.observer`). Todo lo que se coloque en la escena a una altura sale de aquí o se pega al tileset.
 * El marco horizontal es ME, confirmado por R3 (perfiles DEM frente a tileset: desfase ≤ 15 m).
 */
import { Cartographic, type Scene } from "cesium";
import { useEffect, useState } from "react";

const FRAME_MS = 100;

export function useTilesetHeight(
  scene: Scene | undefined,
  tilesetReady: boolean,
  point?: { lat: number; lon: number },
) {
  const [sample, setSample] = useState<{ key: string; height: number }>();
  const lat = point?.lat;
  const lon = point?.lon;
  const key = lat === undefined || lon === undefined ? undefined : `${lat},${lon}`;

  useEffect(() => {
    if (!scene || !tilesetReady || lat === undefined || lon === undefined) return;
    let cancelled = false;
    // Con requestRenderMode un visor quieto no dibuja fotogramas y el muestreo (que avanza con la carga de
    // tiles en cada fotograma) se queda esperando: se piden fotogramas hasta que llegue la altura.
    const frames = setInterval(() => scene.requestRender(), FRAME_MS);
    scene
      .sampleHeightMostDetailed([Cartographic.fromDegrees(lon, lat)])
      .then(([c]) => {
        if (!cancelled && c?.height !== undefined)
          setSample({ key: `${lat},${lon}`, height: c.height });
      })
      .catch(() => {}) // sin soporte de muestreo: el llamador usa su valor de respaldo
      .finally(() => clearInterval(frames));
    return () => {
      cancelled = true;
      clearInterval(frames);
    };
  }, [scene, tilesetReady, lat, lon]);

  return sample && sample.key === key ? sample.height : undefined;
}
