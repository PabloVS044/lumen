/**
 * Enlaces y colores de /explore (sección 12.3). Owner: Frontend 3D.
 * Formato de URL: /site?lat&lon&h&start&end&t&tab y /compare?s=lat,lon,start,end (repetido).
 */
export interface DateRange {
  start: string;
  end: string;
}

interface LatLon {
  lat: number;
  lon: number;
}

const OBS_HEIGHT_M = 2;

export function siteHref(site: LatLon, range: DateRange, t: string) {
  const q = new URLSearchParams({
    lat: String(site.lat),
    lon: String(site.lon),
    h: String(OBS_HEIGHT_M),
    start: range.start,
    end: range.end,
    t,
    tab: "horizon",
  });
  return `/site?${q}`;
}

export function compareHref(sites: LatLon[], range: DateRange) {
  if (sites.length === 0) return "/compare";
  // Coma y fechas van sin codificar, como en el ejemplo de la sección 12.3.
  return `/compare?${sites.map((s) => `s=${s.lat},${s.lon},${range.start},${range.end}`).join("&")}`;
}

/** Token del primer color de sitio libre (los 4 de globals.css); undefined si ya hay 4. */
export function nextFreeColor(active: { color: string }[]) {
  const used = new Set(active.map((s) => s.color));
  return [1, 2, 3, 4].map((n) => `var(--color-site-${n})`).find((c) => !used.has(c));
}

export const rangeOf = (w: { startMs: number; endMs: number }): DateRange => ({
  start: new Date(w.startMs).toISOString().slice(0, 10),
  end: new Date(w.endMs).toISOString().slice(0, 10),
});
