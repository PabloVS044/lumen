/**
 * Matemática del heatmap de visibilidad (M3, sección 12.2). Owner: Frontend Charts.
 * Días UTC en filas (0 = día de la primera muestra), horas UTC en columnas.
 */
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

export type HeatCell = [hour: number, day: number, value: number];

const dayOf = (t: number, firstDay: number) => Math.floor(t / DAY_MS) - firstDay;
const hourOf = (t: number) => Math.floor((t % DAY_MS) / HOUR_MS);

/** Promedia las muestras de cada (día, hora UTC). Las etiquetas de día cubren también los huecos. */
export function buildHeatmap(timesMs: number[], values: number[]) {
  if (timesMs.length === 0) return { days: [] as string[], cells: [] as HeatCell[] };
  const firstDay = Math.floor(timesMs[0]! / DAY_MS);
  const lastDay = Math.floor(timesMs[timesMs.length - 1]! / DAY_MS);
  const acc = new Map<number, { sum: number; n: number; hour: number; day: number }>();
  timesMs.forEach((t, i) => {
    const day = dayOf(t, firstDay);
    const hour = hourOf(t);
    const key = day * 24 + hour;
    const cell = acc.get(key) ?? { sum: 0, n: 0, hour, day };
    cell.sum += values[i] ?? 0;
    cell.n += 1;
    acc.set(key, cell);
  });
  const days = Array.from({ length: lastDay - firstDay + 1 }, (_, d) =>
    new Date((firstDay + d) * DAY_MS).toISOString().slice(0, 10),
  );
  const cells = [...acc.values()].map((c): HeatCell => [c.hour, c.day, c.sum / c.n]);
  return { days, cells };
}

/** 0 = no visible, 1 = parcial, 2 = visible (fracción del disco o del intervalo). */
export const classify = (fraction: number) => (fraction >= 0.995 ? 2 : fraction <= 0.005 ? 0 : 1);

/** Racha más larga de `value` (la primera si hay empate). */
export function longestRun(flags: boolean[], value: boolean) {
  let best = { start: 0, len: 0 };
  let cur = 0;
  flags.forEach((f, i) => {
    cur = f === value ? cur + 1 : 0;
    if (cur > best.len) best = { start: i - cur + 1, len: cur };
  });
  return best;
}

/** Tramo por día, en celdas (hora inicial incluida, final excluida), de las muestras i0..i1. */
export function runSegments(timesMs: number[], i0: number, i1: number) {
  const firstDay = Math.floor(timesMs[0]! / DAY_MS);
  const byDay = new Map<number, { day: number; h0: number; h1: number }>();
  for (let i = i0; i <= i1; i++) {
    const t = timesMs[i]!;
    const day = dayOf(t, firstDay);
    const hour = hourOf(t);
    const seg = byDay.get(day);
    if (seg) {
      seg.h0 = Math.min(seg.h0, hour);
      seg.h1 = Math.max(seg.h1, hour + 1);
    } else byDay.set(day, { day, h0: hour, h1: hour + 1 });
  }
  return [...byDay.values()];
}

/** Media diaria (0-100 %) de un panel: la tabla alternativa del gráfico (sección 12.5). */
export function dailyPercent(days: string[], cells: HeatCell[]) {
  const sum = days.map(() => 0);
  const n = days.map(() => 0);
  for (const [, day, v] of cells) {
    sum[day]! += v;
    n[day]! += 1;
  }
  return days.map((d, i) => ({ day: d, pct: n[i] ? (100 * sum[i]!) / n[i]! : null }));
}

interface RunInfo {
  hours: number;
  start: string;
  end: string;
}

const fmt = (n: number) => n.toFixed(1);

/** Resumen en texto del heatmap (sección 12.5). */
export function heatSummary(i: {
  sunPct: number;
  earthPct: number;
  operablePct: number;
  dark?: RunInfo;
  blackout?: RunInfo;
}) {
  const run = (label: string, r?: RunInfo) =>
    r && r.hours > 0
      ? ` The longest ${label} lasts ${fmt(r.hours)} h, from ${r.start} to ${r.end} UTC.`
      : "";
  return (
    `The Sun is visible ${fmt(i.sunPct)}% of the time.${run("dark spell", i.dark)} ` +
    `The Earth is visible ${fmt(i.earthPct)}% of the time.${run("communications blackout", i.blackout)} ` +
    `Sun and Earth are both available ${fmt(i.operablePct)}% of the time.`
  );
}
