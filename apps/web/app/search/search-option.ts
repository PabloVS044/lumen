/** Opción de ECharts del mapa de calor de la búsqueda. Owner: Frontend Analysis (issue #41). */

export interface SearchColors {
  low: string;
  high: string;
  top: string;
  center: string;
  text: string;
  muted: string;
}

export function searchOption(
  cells: [number, number, number][],
  topKm: [number, number][],
  objective: { label: string; unit: string },
  c: SearchColors,
) {
  const values = cells.map((cell) => cell[2]);
  const [min, max] = values.length ? [Math.min(...values), Math.max(...values)] : [0, 1];
  return {
    animation: false,
    aria: { enabled: true },
    grid: { left: 56, right: 24, top: 16, bottom: 72 },
    tooltip: {},
    xAxis: {
      type: "value",
      name: "x from center (km)",
      nameLocation: "middle",
      nameGap: 26,
      nameTextStyle: { color: c.muted },
      axisLabel: { color: c.muted },
    },
    yAxis: {
      type: "value",
      name: "y from center (km)",
      nameTextStyle: { color: c.muted },
      axisLabel: { color: c.muted },
    },
    visualMap: {
      min,
      max: max > min ? max : min + 1,
      dimension: 2,
      seriesIndex: 0,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      calculable: true,
      text: [`${objective.label} (${objective.unit}) high`, "low"],
      textStyle: { color: c.text },
      inRange: { color: [c.low, c.high] },
    },
    series: [
      { name: objective.label, type: "scatter", symbol: "rect", symbolSize: 6, data: cells },
      {
        name: "Best spots",
        type: "scatter",
        symbolSize: 12,
        itemStyle: { color: c.top, borderColor: c.text, borderWidth: 1 },
        data: topKm,
      },
      {
        name: "Center",
        type: "scatter",
        symbol: "diamond",
        symbolSize: 12,
        itemStyle: { color: c.center },
        data: [[0, 0]],
      },
    ],
  };
}
