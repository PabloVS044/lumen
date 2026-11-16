"use client";

/** Envoltorio de ECharts (solo los módulos usados) para el mapa de la búsqueda. */
import { ScatterChart } from "echarts/charts";
import {
  AriaComponent,
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import ReactEChartsCore from "echarts-for-react/lib/core";

import { ChartDownload } from "@/components/export/chart-download";

echarts.use([
  ScatterChart,
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  AriaComponent,
  CanvasRenderer,
]);

export function SearchChart({ option, label }: { option: object; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <ChartDownload option={option} name={label} />
      <div role="img" aria-label={label}>
        <ReactEChartsCore echarts={echarts} option={option} style={{ height: 420 }} notMerge />
      </div>
    </div>
  );
}
