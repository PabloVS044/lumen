/** Opción de ECharts del simulador: SoC (%) y potencias (W) en el tiempo. Owner: Frontend Analysis. */

export interface PowerColors {
  soc: string;
  generated: string;
  consumed: string;
  brownout: string;
  text: string;
  muted: string;
}

export interface PowerSeries {
  timesMs: number[];
  socPct: number[];
  genW: number[];
  loadW: number[];
  /** Instante del primer brownout (ms) o null. */
  brownoutMs: number | null;
  /** Reserva de la batería en % (100 − DoD). */
  reservePct: number;
}

const pairs = (t: number[], v: number[]) => t.map((x, i) => [x, v[i] ?? null]);

export function powerOption(s: PowerSeries, c: PowerColors) {
  return {
    animation: false,
    aria: { enabled: true },
    grid: { left: 56, right: 64, top: 36, bottom: 40 },
    legend: { top: 0, textStyle: { color: c.text } },
    tooltip: { trigger: "axis", valueFormatter: (v: number) => (v == null ? "-" : v.toFixed(1)) },
    xAxis: { type: "time", axisLabel: { color: c.muted } },
    yAxis: [
      {
        type: "value",
        name: "Charge %",
        min: 0,
        max: 100,
        nameTextStyle: { color: c.muted },
        axisLabel: { color: c.muted },
      },
      {
        type: "value",
        name: "Power W",
        nameTextStyle: { color: c.muted },
        axisLabel: { color: c.muted },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: "Battery charge",
        type: "line",
        yAxisIndex: 0,
        showSymbol: false,
        data: pairs(s.timesMs, s.socPct),
        lineStyle: { color: c.soc, width: 2 },
        itemStyle: { color: c.soc },
        markLine: {
          symbol: "none",
          silent: true,
          label: { color: c.muted, formatter: "Reserve" },
          lineStyle: { color: c.muted, type: "dashed" },
          data: [{ yAxis: s.reservePct }],
        },
      },
      {
        name: "Generated",
        type: "line",
        yAxisIndex: 1,
        showSymbol: false,
        data: pairs(s.timesMs, s.genW),
        lineStyle: { color: c.generated, width: 1 },
        itemStyle: { color: c.generated },
      },
      {
        name: "Load",
        type: "line",
        yAxisIndex: 1,
        showSymbol: false,
        step: "end",
        data: pairs(s.timesMs, s.loadW),
        lineStyle: { color: c.consumed, width: 1, type: "dotted" },
        itemStyle: { color: c.consumed },
        markLine:
          s.brownoutMs === null
            ? undefined
            : {
                symbol: "none",
                silent: true,
                label: { color: c.brownout, formatter: "Power runs out" },
                lineStyle: { color: c.brownout, width: 2 },
                data: [{ xAxis: s.brownoutMs }],
              },
      },
    ],
  };
}
