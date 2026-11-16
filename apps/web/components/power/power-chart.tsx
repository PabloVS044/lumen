"use client";

/** Envoltorio de ECharts (solo los módulos usados) para el simulador. Owner: Frontend Analysis. */
import { LineChart } from "echarts/charts";
import {
  AriaComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import ReactEChartsCore from "echarts-for-react/lib/core";

echarts.use([
  LineChart,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  AriaComponent,
  CanvasRenderer,
]);

interface Props {
  option: object;
  label: string;
}

export function PowerChart({ option, label }: Props) {
  return (
    <div role="img" aria-label={label}>
      <ReactEChartsCore echarts={echarts} option={option} style={{ height: 320 }} notMerge />
    </div>
  );
}
