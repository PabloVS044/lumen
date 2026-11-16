"use client";

/**
 * SiteMarkers — marcadores del catálogo en el globo (M4, sección 12.2). Owner: Frontend 3D.
 * Neutros por defecto; los sitios del escenario usan su color del store.
 */
import type { CatalogSite } from "@lumen/sdk";
import { Cartesian2, Cartesian3, DistanceDisplayCondition, Ellipsoid } from "cesium";
import { Entity } from "resium";

import { useScenarioStore } from "@/stores/scenario-store";

import { cssColor, tokenColor } from "./token-color";

const LABEL_FAR_M = 1_500_000;

interface Props {
  sites: CatalogSite[];
  selectedId?: string;
  onSelect: (site: CatalogSite) => void;
}

export function SiteMarkers({ sites, selectedId, onSelect }: Props) {
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
        position={Cartesian3.fromDegrees(site.lon, site.lat, 0, Ellipsoid.MOON)}
        point={{ pixelSize: selected ? 14 : 9, color }}
        label={{
          text: site.name,
          show: true,
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
