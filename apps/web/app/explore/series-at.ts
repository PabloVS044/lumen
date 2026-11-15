/** Muestra de `GetSeries` más cercana a un instante (az/el topocéntricos del motor). Owner: Frontend 3D. */
interface Body {
  azDeg: number[];
  elDeg: number[];
}

interface SeriesLike {
  time: { seconds: bigint; nanos?: number }[];
  sun?: Body;
  earth?: Body;
}

export function sampleAt(series: SeriesLike, ms: number) {
  if (series.time.length === 0 || !series.sun || !series.earth) return undefined;
  let best = 0;
  let bestDt = Infinity;
  series.time.forEach((t, i) => {
    const dt = Math.abs(Number(t.seconds) * 1000 + (t.nanos ?? 0) / 1e6 - ms);
    if (dt < bestDt) [best, bestDt] = [i, dt];
  });
  return {
    sun: { az: series.sun.azDeg[best]!, el: series.sun.elDeg[best]! },
    earth: { az: series.earth.azDeg[best]!, el: series.earth.elDeg[best]! },
  };
}
