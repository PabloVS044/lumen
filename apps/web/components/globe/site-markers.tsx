"use client";

/**
 * SiteMarkers — marcadores del catálogo en el globo (M4, sección 12.2). Owner: Frontend 3D.
 * Neutros por defecto; los sitios del escenario usan su color del store.
 */
import type { CatalogSite } from "@lumen/sdk";
import {
  Cartesian2,
  Cartesian3,
  DistanceDisplayCondition,
  Ellipsoid,
  HeightReference,
} from "cesium";
import { Entity } from "resium";

import { useScenarioStore } from "@/stores/scenario-store";

import {
  LABEL_DEPTH_TEST_OFF_M,
  POINT_DEPTH_TEST_OFF_M,
  SELECTED_POINT_DEPTH_TEST_OFF_M,
} from "./marker-depth";
import { cssColor, tokenColor } from "./token-color";

const LABEL_FAR_M = 1_500_000;

export interface SiteStatus {
  sun: boolean;
  earth: boolean;
}

interface Props {
  sites: CatalogSite[];
  selectedId?: string;
  /** Sol y Tierra sobre el horizonte real del sitio seleccionado, según el motor, en `currentTime`. */
  selectedStatus?: SiteStatus;
  onSelect: (site: CatalogSite) => void;
}

export function SiteMarkers({ sites, selectedId, selectedStatus, onSelect }: Props) {
  const active = useScenarioStore((s) => s.sites);
  const neutral = tokenColor("--color-muted");
  const selectedColor = tokenColor("--color-text");

  return sites.map((site) => {
    const selected = site.id === selectedId;
    const activeColor = active.find((a) => a.id === site.id)?.color;
    const color = activeColor ? cssColor(activeColor) : selected ? selectedColor : neutral;
    return (
      <Entity
        key={site.id}
        id={site.id}
        // Altura 0 + CLAMP_TO_3D_TILE: la altura la pone el propio tileset. No se usa ninguna altura del
        // motor (el tileset está ~659 m sobre el DEM; ver use-tileset-height.ts).
        position={Cartesian3.fromDegrees(site.lon, site.lat, 0, Ellipsoid.MOON)}
        point={{
          pixelSize: selected ? 14 : 9,
          color,
          heightReference: HeightReference.CLAMP_TO_3D_TILE,
          disableDepthTestDistance: selected
            ? SELECTED_POINT_DEPTH_TEST_OFF_M
            : POINT_DEPTH_TEST_OFF_M,
        }}
        label={{
          text:
            selected && selectedStatus
              ? `${site.name}
Sun ${selectedStatus.sun ? "visible" : "not visible"}, Earth ${selectedStatus.earth ? "visible" : "not visible"}`
              : site.name,
          show: true,
          heightReference: HeightReference.CLAMP_TO_3D_TILE,
          disableDepthTestDistance: LABEL_DEPTH_TEST_OFF_M,
          font: "13px sans-serif",
          fillColor: selectedColor,
          pixelOffset: new Cartesian2(0, -18),
          distanceDisplayCondition: selected
            ? undefined
            : new DistanceDisplayCondition(0, LABEL_FAR_M),
        }}
        onClick={() => onSelect(site)}
      />
    );
  });
}
