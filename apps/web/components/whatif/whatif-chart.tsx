"use client";

/** Envoltorio de ECharts (solo los módulos usados) para el what-if. Owner: Frontend Analysis. */
import { LineChart, ScatterChart } from "echarts/charts";
import {
  AriaComponent,
  GridComponent,
  MarkAreaComponent,
  TooltipComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import ReactEChartsCore from "echarts-for-react/lib/core";

import { ChartDownload } from "@/components/export/chart-download";

echarts.use([
  LineChart,
  ScatterChart,
  GridComponent,
  MarkAreaComponent,
  TooltipComponent,
  AriaComponent,
  CanvasRenderer,
]);

interface Props {
  option: object;
  label: string;
}

export function WhatIfLineChart({ option, label }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <ChartDownload option={option} name={label} />
      <div role="img" aria-label={label}>
        <ReactEChartsCore echarts={echarts} option={option} style={{ height: 220 }} notMerge />
      </div>
    </div>
  );
}
