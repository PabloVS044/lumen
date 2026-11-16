"use client";

/**
 * Sincroniza `currentTime` (store) con `?t=` (M13, HU-10). Archivo compartido.
 * Al abrir un enlace, `t` fija el instante; después, cada cambio del instante (clic en el polar o
 * el heatmap) se escribe en la URL, así el enlace copiado reproduce la vista.
 */
import { useQueryState } from "nuqs";
import { useEffect } from "react";

import { useScenarioStore } from "@/stores/scenario-store";

import { replaceUrl, siteSearchParams } from "./url-state";

export function useUrlTimeSync() {
  const [t, setT] = useQueryState(
    "t",
    siteSearchParams.t.withOptions({ ...replaceUrl, throttleMs: 500 }),
  );
  const currentTime = useScenarioStore((s) => s.currentTime);

  useEffect(() => {
    if (t && !useScenarioStore.getState().currentTime)
      useScenarioStore.getState().setCurrentTime(t);
  }, [t]);

  useEffect(() => {
    if (currentTime && currentTime !== t) void setT(currentTime);
  }, [currentTime, t, setT]);
}
