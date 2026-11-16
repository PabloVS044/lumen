/**
 * Datos SINTÉTICOS para desarrollo sin motor. No son resultados científicos.
 * Todo mensaje mock lleva `meta.engineVersion = "mock"` para que la UI pueda avisarlo.
 * Compartido: cada área amplía su generador aquí (nunca en apps/web).
 */
import { create } from "@bufbuild/protobuf";
import { Code, ConnectError } from "@connectrpc/connect";
import { timestampDate, timestampFromDate } from "@bufbuild/protobuf/wkt";

import {
  AnalysisResultSchema,
  AnalyzeRequestSchema,
  MetricsSchema,
  SeriesSchema,
  type AnalysisResult,
  type AnalyzeRequest,
} from "../gen/lumen/v1/analysis_pb";
import {
  BodySeriesSchema,
  ErrorDetailSchema,
  IntervalSchema,
  type Site,
} from "../gen/lumen/v1/common_pb";
import {
  EventSchema,
  EventType,
  type Event,
  type GetSeriesRequest,
  type ListEventsRequest,
} from "../gen/lumen/v1/ephemeris_pb";
import { HorizonMaskSchema, ObserverSchema, type HorizonMask } from "../gen/lumen/v1/horizon_pb";
import { CatalogSiteSchema, Region, SiteStatus, type CatalogSite } from "../gen/lumen/v1/sites_pb";
import { CoverageSchema } from "../gen/lumen/v1/terrain_pb";
import {
  PanelOrientation,
  SimulateRequestSchema,
  SimulateResponseSchema,
  type SimulateRequest,
} from "../gen/lumen/v1/power_pb";
import {
  EvaluateResponseSchema,
  WhatIfPointSchema,
  type EvaluateRequest,
} from "../gen/lumen/v1/whatif_pb";
import type { Metrics } from "../gen/lumen/v1/analysis_pb";

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

/** Series az/el de Sol y Tierra del sitio: las mismas que `mockAnalysis` para el rango pedido. */
export function mockSeries(req: GetSeriesRequest) {
  const { series } = mockAnalysis(
    create(AnalyzeRequestSchema, { site: req.site, range: req.range }),
  );
  return { time: series?.time ?? [], sun: series?.sun, earth: series?.earth };
}

const AU_KM = 149_597_870.7;
const SOLAR_CONSTANT_W_M2 = 1361;

/**
 * Simulación de batería sobre la serie sintética de `mockAnalysis`, con el modelo de la sección 9.8
 * y los defaults del preset "lander pequeño". Sirve para desarrollar la UI sin motor; no es ciencia.
 */
export function mockSimulate(req: SimulateRequest) {
  const scenario = req.scenario!;
  const cfg = req.config;
  const opt = (v: number | undefined, d: number) => (v === undefined ? d : v);
  const area = opt(cfg?.panelAreaM2, 2);
  const eff = opt(cfg?.efficiency, 0.28);
  const capacity = opt(cfg?.batteryWh, 2000);
  const soc0 = opt(cfg?.soc0Pct, 100);
  const dod = opt(cfg?.maxDodPct, 80);
  const loadDay = opt(cfg?.loadDayW, 150);
  const loadNight = opt(cfg?.loadNightW, 60);
  const etaB = opt(cfg?.batteryEfficiency, 0.95);
  const orientation = cfg?.orientation || PanelOrientation.VERTICAL_TRACKING;
  const panelAz = cfg?.panelAzimuthDeg ?? 0;

  const { series } = mockAnalysis(
    create(AnalyzeRequestSchema, { site: scenario.site, range: scenario.range }),
  );
  const time = series?.time ?? [];
  const sun = series?.sun;
  const rad = Math.PI / 180;
  const pGen = time.map((_, i) => {
    const el = (sun?.elDeg[i] ?? 0) * rad;
    const az = (sun?.azDeg[i] ?? 0) * rad;
    const g =
      orientation === PanelOrientation.HORIZONTAL
        ? Math.sin(Math.max(el, 0))
        : orientation === PanelOrientation.VERTICAL_FIXED
          ? Math.max(0, Math.cos(el) * Math.cos(az - panelAz * rad))
          : Math.cos(el);
    const s0 = SOLAR_CONSTANT_W_M2 * (AU_KM / (sun?.distKm[i] ?? AU_KM)) ** 2;
    return eff * area * s0 * (sun?.fraction[i] ?? 0) * g;
  });
  const pLoad = time.map((_, i) => ((sun?.fraction[i] ?? 0) > 0 ? loadDay : loadNight));
  const stepH =
    time.length > 1
      ? (timestampDate(time[1]!).getTime() - timestampDate(time[0]!).getTime()) / HOUR_MS
      : 1;
  const reserve = capacity * (1 - dod / 100);
  let e = (capacity * soc0) / 100;
  let unserved = 0;
  let brownout: number | undefined;
  const energy: number[] = [];
  time.forEach((_, i) => {
    energy.push(e);
    if (i === time.length - 1) return;
    const delta = (pGen[i]! - pLoad[i]!) * stepH;
    e += delta > 0 ? delta * etaB : delta / etaB;
    if (e < reserve) {
      unserved += (reserve - e) * etaB;
      e = reserve;
      brownout ??= i + 1;
    }
    e = Math.min(e, capacity);
  });
  const minEnergy = Math.min(...energy);
  return create(SimulateResponseSchema, {
    time,
    pGenW: pGen,
    pLoadW: pLoad,
    socPct: energy.map((x) => (100 * x) / capacity),
    survives: brownout === undefined,
    firstBrownoutTime: brownout === undefined ? undefined : time[brownout],
    minSocPct: (100 * minEnergy) / capacity,
    energyMarginWh: unserved > 0 ? -unserved : minEnergy - reserve,
  });
}

/** Métricas aceptadas por el what-if y si "más es mejor" (igual que metrics/score.py del motor). */
export const WHATIF_METRICS: Record<string, boolean> = {
  illumination_pct: true,
  illumination_pct_weighted: true,
  longest_dark_h: false,
  earth_visible_pct: true,
  earth_visible_h: true,
  longest_comm_window_h: true,
  longest_comm_blackout_h: false,
  operable_pct: true,
  longest_operable_window_h: true,
  energy_kwh_per_m2: true,
};
export const WHATIF_DEFAULT_METRICS = ["illumination_pct", "longest_dark_h", "operable_pct"];

const camel = (name: string) => name.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/**
 * What-if sobre la serie sintética: una ventana de misión por retraso, batería opcional y
 * retrasos recomendados a ≤ 0.1 del mejor score de pesos iguales (sección 9.9). Datos sintéticos.
 */
export function mockWhatIf(req: EvaluateRequest) {
  const names = req.metrics.length ? [...req.metrics] : WHATIF_DEFAULT_METRICS;
  const unknown = names.filter((n) => !(n in WHATIF_METRICS));
  if (unknown.length) {
    throw new ConnectError("Unknown metric for what-if.", Code.InvalidArgument, undefined, [
      {
        desc: ErrorDetailSchema,
        value: create(ErrorDetailSchema, {
          code: "UNKNOWN_METRIC",
          context: { metrics: unknown.join(",") },
        }),
      },
    ]);
  }
  const stepH = req.delayStepHours || 24;
  const durationMs = req.missionDurationDays * 24 * HOUR_MS;
  const nominal = timestampDate(req.nominalLanding!).getTime();
  const points = [];
  for (let k = 0; k * stepH <= req.maxDelayDays * 24; k++) {
    const landing = nominal + k * stepH * HOUR_MS;
    const range = {
      start: timestampFromDate(new Date(landing)),
      end: timestampFromDate(new Date(landing + durationMs)),
      stepMinutes: 60,
    };
    const m = mockAnalysis(create(AnalyzeRequestSchema, { site: req.site, range })).metrics;
    const survives = req.power
      ? mockSimulate(
          create(SimulateRequestSchema, { scenario: { site: req.site, range }, config: req.power }),
        ).survives
      : undefined;
    points.push(
      create(WhatIfPointSchema, {
        delayHours: k * stepH,
        landing: range.start,
        metrics: Object.fromEntries(
          names.map((n) => [
            n,
            Number((m as Metrics | undefined)?.[camel(n) as keyof Metrics] ?? 0),
          ]),
        ),
        survives,
      }),
    );
  }
  const score = points.map(() => 0);
  for (const n of names) {
    const v = points.map((p) => p.metrics[n] ?? 0);
    const lo = Math.min(...v);
    const hi = Math.max(...v);
    v.forEach((x, i) => {
      const norm = hi === lo ? 1 : (x - lo) / (hi - lo);
      score[i]! += WHATIF_METRICS[n] ? norm : 1 - norm;
    });
  }
  const best = Math.max(...score.map((x) => x / names.length));
  return create(EvaluateResponseSchema, {
    points,
    recommendedDelaysHours: points
      .filter((p, i) => score[i]! / names.length >= best - 0.1 && p.survives !== false)
      .map((p) => p.delayHours),
  });
}
