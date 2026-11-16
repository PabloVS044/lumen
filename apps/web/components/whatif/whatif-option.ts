/** Opción de ECharts de un panel del what-if: una métrica vs días de retraso. Owner: Frontend Analysis. */
import type { PointView } from "./whatif-math";

export interface WhatIfColors {
  line: string;
  recommended: string;
  failing: string;
  text: string;
  muted: string;
}

export function whatIfOption(
  metric: { key: string; label: string; unit: string },
  points: PointView[],
  recommendedHours: number[],
  spans: [number, number][],
  c: WhatIfColors,
) {
  const rec = new Set(recommendedHours);
  return {
    animation: false,
    aria: { enabled: true },
    grid: { left: 56, right: 24, top: 28, bottom: 40 },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "value",
      name: "Delay (days)",
      nameLocation: "middle",
      nameGap: 26,
      nameTextStyle: { color: c.muted },
      axisLabel: { color: c.muted },
    },
    yAxis: {
      type: "value",
      name: `${metric.label} (${metric.unit})`,
      nameTextStyle: { color: c.muted },
      axisLabel: { color: c.muted },
      scale: true,
    },
    series: [
      {
        name: metric.label,
        type: "line",
        showSymbol: false,
        data: points.map((pt) => [pt.delayHours / 24, pt.metrics[metric.key] ?? null]),
        lineStyle: { color: c.line, width: 2 },
        itemStyle: { color: c.line },
        markArea: spans.length
          ? {
              silent: true,
              itemStyle: { color: c.failing, opacity: 0.18 },
              label: { color: c.failing },
              data: spans.map(([a, b]) => [
                { xAxis: a - 0.5, name: "Battery fails" },
                { xAxis: b + 0.5 },
              ]),
            }
          : undefined,
      },
      {
        name: "Recommended",
        type: "scatter",
        symbolSize: 9,
        itemStyle: { color: c.recommended },
        data: points
          .filter((pt) => rec.has(pt.delayHours))
          .map((pt) => [pt.delayHours / 24, pt.metrics[metric.key] ?? null]),
      },
    ],
  };
}
