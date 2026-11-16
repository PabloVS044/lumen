/**
 * Rejilla días × horas UTC para el mini-heatmap del comparador (HU-04 AC3). Owner: Frontend Analysis.
 * Todo en UTC: una fila por día, una columna por hora 0–23.
 */
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

export interface HourlyGrid {
  /** Inicio (ms UTC) de cada día. */
  days: number[];
  /** [día][hora]: media de los valores en esa hora; null fuera del periodo. */
  cells: (number | null)[][];
}

const dayStart = (ms: number) => Math.floor(ms / DAY_MS) * DAY_MS;

export function hourlyGrid(
  times: number[],
  values: number[],
  startMs: number,
  endMs: number,
  stepMs: number,
): HourlyGrid {
  const first = dayStart(startMs);
  const nDays = Math.max(
    1,
    Math.floor((dayStart(Math.max(endMs - 1, startMs)) - first) / DAY_MS) + 1,
  );
  const days = Array.from({ length: nDays }, (_, d) => first + d * DAY_MS);
  const sum = days.map(() => new Array<number>(24).fill(0));
  const count = days.map(() => new Array<number>(24).fill(0));

  times.forEach((t, i) => {
    const d = Math.floor((t - first) / DAY_MS);
    const h = Math.floor((t - first - d * DAY_MS) / HOUR_MS);
    if (d < 0 || d >= nDays) return;
    sum[d]![h]! += values[i] ?? 0;
    count[d]![h]! += 1;
  });

  // Horas sin muestra propia (paso > 1 h): la muestra anterior más cercana, si está a menos de un paso.
  let j = 0;
  const cells = days.map((day, d) =>
    Array.from({ length: 24 }, (_, h) => {
      const cellStart = day + h * HOUR_MS;
      if (cellStart + HOUR_MS <= startMs || cellStart >= endMs) return null;
      if (count[d]![h]! > 0) return sum[d]![h]! / count[d]![h]!;
      while (j + 1 < times.length && times[j + 1]! <= cellStart) j++;
      const t = times[j];
      return t !== undefined && t <= cellStart && cellStart - t < stepMs
        ? (values[j] ?? null)
        : null;
    }),
  );
  return { days, cells };
}
