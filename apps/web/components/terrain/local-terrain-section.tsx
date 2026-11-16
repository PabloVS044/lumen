"use client";

/**
 * LocalTerrainSection — la vista a ras de suelo, plegada: solo se monta (y carga Cesium) al abrirla.
 * Owner: Frontend 3D. Se usa igual en /site y en el panel de /explore.
 */
import { useState } from "react";

import type { RangeProp, SiteProp } from "@/components/horizon/use-analysis";

import { LocalTerrain } from "./local-terrain";

export function LocalTerrainSection({ site, range }: { site: SiteProp; range: RangeProp }) {
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(e) => setOpen(e.currentTarget.open)} className="text-sm">
      <summary className="cursor-pointer font-medium">Local terrain view (ground level)</summary>
      {open && (
        <div className="pt-3">
          <LocalTerrain site={site} range={range} />
        </div>
      )}
    </details>
  );
}
