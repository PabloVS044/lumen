"use client";

/**
 * Carga Cesium solo en cliente (sección 12.2, riesgo R6). Owner: Frontend 3D.
 * Antes de importar cesium: window.CESIUM_BASE_URL = "/cesium" (assets copiados en postinstall).
 */
import dynamic from "next/dynamic";

export const GlobeLoader = dynamic(() => import("./globe").then((m) => m.Globe), {
  ssr: false,
  loading: () => <div className="p-6 text-sm text-muted">Cargando globo…</div>,
});
