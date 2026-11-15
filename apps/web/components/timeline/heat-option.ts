/** Opciones de ECharts de un panel del heatmap (días x horas UTC). Owner: Frontend Charts. */
import type { HeatCell } from "./heatmap-math";
import { classify } from "./heatmap-math";

export interface HeatColors {
  hidden: string;
  partial: string;
  visible: string;
  text: string;
  muted: string;
  space: string;
  mark: string;
  now: string;
}

export interface Segment {
  day: number;
  h0: number;
  h1: number;
}

export const CLASS_LABEL = ["not visible", "partial", "visible"] as const;
const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));

// Rectángulo sin relleno sobre un rango de celdas de un mismo día.
const outlineRect =
  (color: string, dash?: number[]) =>
  (
    _: unknown,
    api: {
      value: (i: number) => number;
      coord: (v: number[]) => number[];
      size: (v: number[]) => number[];
    },
  ) => {
    const [h0, h1, day] = [api.value(0), api.value(1), api.value(2)] as [number, number, number];
    const [x, y] = api.coord([h0, day]) as [number, number];
    const [w, h] = api.size([1, 1]) as [number, number];
    return {
      type: "rect" as const,
      shape: { x: x - w / 2, y: y - h / 2, width: w * (h1 - h0), height: h },
      style: { fill: "none", stroke: color, lineWidth: 2, lineDash: dash },
    };
  };

export function panelOption(p: {
  name: string;
  days: string[];
  cells: HeatCell[];
  marks: Segment[];
  nowCell?: [number, number];
  colors: HeatColors;
}) {
  const { colors: c } = p;
  const rowStep = p.days.length > 45 ? Math.ceil(p.days.length / 15) : 0;
  return {
    animation: false,
    aria: { enabled: true },
    grid: { left: 78, right: 12, top: 6, bottom: 26 },
    tooltip: {
      position: "top",
      formatter: (a: { value: number[] }) => {
        const [hour, day, cls, fraction] = a.value as [number, number, 0 | 1 | 2, number];
        return `${p.days[day]} ${HOURS[hour]}:00 UTC<br/>${p.name}: ${CLASS_LABEL[cls]} (${Math.round(fraction * 100)}%)`;
      },
    },
    xAxis: {
      type: "category",
      data: HOURS,
      axisLabel: { color: c.muted, interval: 2 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "category",
      data: p.days,
      inverse: true,
      axisLabel: { color: c.muted, interval: rowStep },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    visualMap: {
      show: false,
      type: "piecewise",
      dimension: 2,
      pieces: [
        { value: 0, color: c.hidden },
        { value: 1, color: c.partial },
        { value: 2, color: c.visible },
      ],
    },
    series: [
      {
        type: "heatmap",
        name: p.name,
        data: p.cells.map(([h, d, v]) => [h, d, classify(v), v]),
        itemStyle: { borderColor: c.space, borderWidth: 1 },
        emphasis: { itemStyle: { borderColor: c.text, borderWidth: 1 } },
      },
      {
        type: "custom",
        name: "Longest spell",
        silent: true,
        z: 5,
        tooltip: { show: false },
        data: p.marks.map((m) => [m.h0, m.h1, m.day]),
        renderItem: outlineRect(c.mark),
      },
      {
        type: "custom",
        name: "Current time",
        silent: true,
        z: 6,
        tooltip: { show: false },
        data: p.nowCell ? [[p.nowCell[0], p.nowCell[0] + 1, p.nowCell[1]]] : [],
        renderItem: outlineRect(c.now),
      },
    ],
  };
}
