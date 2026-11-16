"use client";

/** Envoltorio de ECharts (solo los módulos usados) para el heatmap. Owner: Frontend Charts. */
import { CustomChart, HeatmapChart } from "echarts/charts";
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
  HeatmapChart,
  CustomChart,
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  AriaComponent,
  CanvasRenderer,
]);

interface Props {
  option: object;
  height: number;
  label: string;
  onCellClick: (day: number, hour: number) => void;
}

export function HeatChart({ option, height, label, onCellClick }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <ChartDownload option={option} name={label} />
      <div role="img" aria-label={label}>
        <ReactEChartsCore
          echarts={echarts}
          option={option}
          style={{ height }}
          notMerge
          onEvents={{
            click: (p: { seriesType?: string; value?: number[] }) => {
              if (p.seriesType === "heatmap" && p.value) onCellClick(p.value[1]!, p.value[0]!);
            },
          }}
        />
      </div>
    </div>
  );
}
