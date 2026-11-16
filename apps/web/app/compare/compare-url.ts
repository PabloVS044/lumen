/**
 * Estado de /compare en la URL (secciones 12.3 y HU-10). Owner: Frontend Analysis (R6, hoy R5).
 * `/compare?s=lat,lon,start,end&s=...&metric=operable_pct`: el mismo formato que genera /explore.
 * ⚠️ Vive aquí y no en lib/url-state.ts (zona compartida); moverlo allí en un PR `contract`.
 */
import { createParser, parseAsNativeArrayOf, parseAsStringLiteral } from "nuqs";

export interface ScenarioParam {
  lat: number;
  lon: number;
  /** YYYY-MM-DD, UTC. */
  start: string;
  end: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

const validDate = (s: string) =>
  DATE_RE.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

export function parseScenario(raw: string): ScenarioParam | null {
  const parts = raw.split(",");
  if (parts.length !== 4) return null;
  const [latS, lonS, start = "", end = ""] = parts;
  const lat = Number(latS);
  const lon = Number(lonS);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (!Number.isFinite(lon) || lon < -180 || lon >= 360) return null;
  try {
    if (!validDate(start) || !validDate(end) || end <= start) return null;
  } catch {
    return null;
  }
  return { lat, lon, start, end };
}

export const serializeScenario = (s: ScenarioParam) => `${s.lat},${s.lon},${s.start},${s.end}`;

const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** El mismo sitio con las fechas desplazadas: "¿y si aterrizamos N días después?" (M6). */
export const shiftScenario = (s: ScenarioParam, days: number): ScenarioParam => ({
  ...s,
  start: addDays(s.start, days),
  end: addDays(s.end, days),
});

export const defaultDates = (nowMs: number) => {
  const start = new Date(nowMs).toISOString().slice(0, 10);
  return { start, end: addDays(start, 30) };
};

const scenarioParser = createParser({
  parse: parseScenario,
  serialize: serializeScenario,
  eq: (a, b) => serializeScenario(a) === serializeScenario(b),
});

export const RANK_METRICS = ["operable_pct", "illumination_pct", "earth_visible_pct"] as const;
export type RankMetric = (typeof RANK_METRICS)[number];

export const compareSearchParams = {
  s: parseAsNativeArrayOf(scenarioParser),
  metric: parseAsStringLiteral(RANK_METRICS).withDefault("operable_pct"),
};

export const MAX_SCENARIOS = 4;
