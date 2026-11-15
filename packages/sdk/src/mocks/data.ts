/**
 * Datos SINTÉTICOS para desarrollo sin motor. No son resultados científicos.
 * Todo mensaje mock lleva `meta.engineVersion = "mock"` para que la UI pueda avisarlo.
 * Compartido: cada área amplía su generador aquí (nunca en apps/web).
 */
import { create } from "@bufbuild/protobuf";
import { timestampDate, timestampFromDate } from "@bufbuild/protobuf/wkt";

import {
  AnalysisResultSchema,
  AnalyzeRequestSchema,
  MetricsSchema,
  SeriesSchema,
  type AnalysisResult,
  type AnalyzeRequest,
} from "../gen/lumen/v1/analysis_pb";
import { BodySeriesSchema, IntervalSchema, type Site } from "../gen/lumen/v1/common_pb";
import {
  EventSchema,
  EventType,
  type Event,
  type ListEventsRequest,
} from "../gen/lumen/v1/ephemeris_pb";
import { HorizonMaskSchema, ObserverSchema, type HorizonMask } from "../gen/lumen/v1/horizon_pb";
import { CatalogSiteSchema, Region, SiteStatus, type CatalogSite } from "../gen/lumen/v1/sites_pb";
import { CoverageSchema } from "../gen/lumen/v1/terrain_pb";

export const MOCK_VERSION = "mock";

const HOUR_MS = 3_600_000;
const SYNODIC_H = 29.53 * 24;
const DRACONIC_H = 27.21 * 24;

export const mockCatalog: CatalogSite[] = [
  ["mock-ridge", "Mock ridge (south pole)", -89.45, -137.31, Region.SOUTH_POLE],
  ["mock-massif", "Mock massif (south pole)", -86.0, 0.0, Region.SOUTH_POLE],
  ["mock-crater", "Mock crater floor (PSR)", -89.67, 129.8, Region.SOUTH_POLE],
  ["mock-mare", "Mock mare (nearside)", 0.67, 23.47, Region.NEARSIDE],
].map(([id, name, lat, lon, region]) =>
  create(CatalogSiteSchema, {
    id: id as string,
    name: name as string,
    lat: lat as number,
    lon: lon as number,
    region: region as Region,
    status: SiteStatus.CANDIDATE,
    program: "Mock",
    coordPrecision: "approx",
    verified: false,
  }),
);

/** Horizonte sintético: relieve suave + un "pico" que depende de la posición. */
export function mockHorizon(site: Site, azStepDeg = 1): HorizonMask {
  const n = Math.round(360 / azStepDeg);
  const seed = Math.abs(site.lat * 7 + site.lon * 3);
  const elevation = Array.from({ length: n }, (_, k) => {
    const az = (k * azStepDeg * Math.PI) / 180;
    return 0.4 + 0.5 * Math.sin(az * 2 + seed) + 0.3 * Math.cos(az * 5 + seed / 2);
  });
  return create(HorizonMaskSchema, {
    azStepDeg,
    elevationDeg: elevation,
    obstacleDistanceM: elevation.map((e, k) => 5_000 + ((k * 997) % 40_000) + e * 1000),
    observer: create(ObserverSchema, {
      lat: site.lat,
      lon: site.lon,
      terrainHeightM: 1500,
      obsHeightM: site.obsHeightM || 2,
    }),
    layersUsed: ["MOCK"],
    maxRangeKm: 200,
  });
}

function longestRun(flags: boolean[], value: boolean): { len: number; start: number } {
  let best = { len: 0, start: 0 };
  let cur = 0;
  flags.forEach((f, i) => {
    cur = f === value ? cur + 1 : 0;
    if (cur > best.len) best = { len: cur, start: i - cur + 1 };
  });
  return best;
}

const pct = (flags: boolean[]) => (100 * flags.filter(Boolean).length) / Math.max(flags.length, 1);

/** Análisis sintético coherente: Sol con periodo sinódico, Tierra con periodo draconítico. */
export function mockAnalysis(req: AnalyzeRequest): AnalysisResult {
  const site = req.site!;
  const start = timestampDate(req.range!.start!).getTime();
  const end = timestampDate(req.range!.end!).getTime();
  const stepH = Math.max(req.range!.stepMinutes || 30, 5) / 60;
  const n = Math.min(Math.floor((end - start) / (stepH * HOUR_MS)) + 1, 100_000);
  const horizon = mockHorizon(site);
  const hAt = (az: number) => horizon.elevationDeg[Math.floor(((az % 360) + 360) % 360)] ?? 0;

  const times: number[] = [];
  const sun = { az: [] as number[], el: [] as number[], fr: [] as number[] };
  const earth = { az: [] as number[], el: [] as number[], fr: [] as number[] };
  const hSun: number[] = [];
  const hEarth: number[] = [];
  const latFactor = Math.cos((site.lat * Math.PI) / 180);
  for (let i = 0; i < n; i++) {
    const tH = i * stepH;
    times.push(start + tH * HOUR_MS);
    const sAz = (360 * tH) / SYNODIC_H;
    const sEl =
      1.5 * Math.sin((2 * Math.PI * tH) / (365.25 * 24)) +
      90 * latFactor * Math.sin((sAz * Math.PI) / 180);
    const eAz = 355 + 6 * Math.sin((2 * Math.PI * tH) / (27.32 * 24));
    const eEl = 0.8 + 6.7 * Math.sin((2 * Math.PI * tH) / DRACONIC_H) + 90 * latFactor;
    sun.az.push(sAz % 360);
    sun.el.push(sEl);
    earth.az.push(eAz % 360);
    earth.el.push(eEl);
    hSun.push(hAt(sAz));
    hEarth.push(hAt(eAz));
    sun.fr.push(Math.min(1, Math.max(0, (sEl - hAt(sAz)) / 0.53 + 0.5)));
    earth.fr.push(Math.min(1, Math.max(0, (eEl - hAt(eAz)) / 1.9 + 0.5)));
  }
  const sunVisible = sun.fr.map((f) => f >= (req.thresholds?.sunMinFraction ?? 0.5));
  const margin = req.thresholds?.earthMarginDeg ?? 0;
  const earthVisible = earth.el.map((e, i) => e >= (hEarth[i] ?? 0) + margin);
  const operable = sunVisible.map((s, i) => s && (earthVisible[i] ?? false));
  const dark = longestRun(sunVisible, false);
  const ts = (ms: number) => timestampFromDate(new Date(ms));

  const events: Event[] = [];
  for (let i = 1; i < n; i++) {
    if (sunVisible[i] !== sunVisible[i - 1])
      events.push(
        create(EventSchema, {
          type: sunVisible[i] ? EventType.SUNRISE : EventType.SUNSET,
          time: ts(times[i]!),
        }),
      );
    if (earthVisible[i] !== earthVisible[i - 1])
      events.push(
        create(EventSchema, {
          type: earthVisible[i] ? EventType.EARTHRISE : EventType.EARTHSET,
          time: ts(times[i]!),
        }),
      );
  }

  return create(AnalysisResultSchema, {
    site: horizon.observer,
    coverage: create(CoverageSchema, {
      layers: ["MOCK"],
      nearResM: 5,
      warnings: ["Synthetic data (SDK mock)"],
    }),
    horizon: req.options?.includeMask === false ? undefined : horizon,
    series:
      req.options?.includeSeries === false
        ? undefined
        : create(SeriesSchema, {
            time: times.map(ts),
            sun: create(BodySeriesSchema, {
              azDeg: sun.az,
              elDeg: sun.el,
              fraction: sun.fr,
              distKm: times.map(() => 1.496e8),
            }),
            earth: create(BodySeriesSchema, {
              azDeg: earth.az,
              elDeg: earth.el,
              fraction: earth.fr,
              distKm: times.map(() => 384_400),
            }),
            horizonAtSunDeg: hSun,
            horizonAtEarthDeg: hEarth,
            eclipseFraction: times.map(() => 0),
            sunVisible,
            earthVisible,
            operable,
          }),
    metrics: create(MetricsSchema, {
      illuminationPct: pct(sunVisible),
      illuminationPctWeighted: (100 * sun.fr.reduce((a, b) => a + b, 0)) / n,
      longestDarkH: dark.len * stepH,
      longestDarkInterval: create(IntervalSchema, {
        start: ts(times[dark.start] ?? start),
        end: ts(times[dark.start + dark.len - 1] ?? start),
        truncated: dark.start === 0 || dark.start + dark.len === n,
      }),
      earthVisiblePct: pct(earthVisible),
      earthVisibleH: earthVisible.filter(Boolean).length * stepH,
      longestCommWindowH: longestRun(earthVisible, true).len * stepH,
      longestCommBlackoutH: longestRun(earthVisible, false).len * stepH,
      operablePct: pct(operable),
      longestOperableWindowH: longestRun(operable, true).len * stepH,
      sunElevMaxDeg: Math.max(...sun.el),
      sunElevMinDeg: Math.min(...sun.el),
      eclipseHours: 0,
    }),
    events,
    meta: {
      engineVersion: MOCK_VERSION,
      computedAt: ts(Date.now()),
      cacheHit: false,
      elapsedMs: 0,
    },
  });
}

/** Próximos eventos del sitio: los mismos que ve `mockAnalysis` en la ventana pedida (determinista). */
export function mockEvents(req: ListEventsRequest): Event[] {
  const from = timestampDate(req.from!).getTime();
  const analysis = mockAnalysis(
    create(AnalyzeRequestSchema, {
      site: req.site,
      range: {
        start: req.from,
        end: timestampFromDate(new Date(from + (req.horizonDays || 60) * 24 * HOUR_MS)),
        stepMinutes: 60,
      },
    }),
  );
  return analysis.events.filter((e) => !req.types.length || req.types.includes(e.type));
}
