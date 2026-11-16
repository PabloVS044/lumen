/**
 * Proyección de la grilla del buscador de mejor punto (motor R2, sección 9.10). Compartido.
 *
 * El motor construye la grilla en la proyección métrica del DEM (`dem.index.metric_crs`):
 * - DEM polares de PGDA: estereográfica polar, +lat_0=±90 +lat_ts=±90 +R=1737400 (|lat| ≥ 80°).
 * - DEM geográficos: azimutal equidistante centrada en el sitio.
 * Estas funciones reproducen esa proyección (verificadas contra pyproj) para ubicar puntos sobre
 * la grilla en la UI y para que el mock genere coordenadas coherentes.
 */
const R_KM = 1737.4;
const RAD = Math.PI / 180;
export const POLAR_GRID_MIN_ABS_LAT = 80;

const isPolar = (lat: number) => Math.abs(lat) >= POLAR_GRID_MIN_ABS_LAT;

function stereo(lat: number, lon: number): [number, number] {
  const south = lat < 0;
  const phi = lat * RAD;
  const rho = 2 * R_KM * Math.tan(Math.PI / 4 + (south ? phi : -phi) / 2);
  const lam = lon * RAD;
  return [rho * Math.sin(lam), (south ? 1 : -1) * rho * Math.cos(lam)];
}

function stereoInverse(x: number, y: number, south: boolean): { lat: number; lon: number } {
  const rho = Math.hypot(x, y);
  const lam = Math.atan2(x, south ? y : -y);
  const phi = 2 * Math.atan(rho / (2 * R_KM)) - Math.PI / 2;
  return { lat: (south ? phi : -phi) / RAD, lon: lam / RAD };
}

/** Desplazamiento (x, y) en km de `point` respecto de `center`, en los ejes de la grilla del motor. */
export function searchGridOffsetKm(
  center: { lat: number; lon: number },
  point: { lat: number; lon: number },
): [number, number] {
  if (isPolar(center.lat)) {
    const [cx, cy] = stereo(center.lat, center.lon);
    const [px, py] = stereo(point.lat, point.lon);
    return [px - cx, py - cy];
  }
  const p1 = center.lat * RAD;
  const p2 = point.lat * RAD;
  const dl = (point.lon - center.lon) * RAD;
  const h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(h));
  const az = Math.atan2(
    Math.sin(dl) * Math.cos(p2),
    Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl),
  );
  return [R_KM * c * Math.sin(az), R_KM * c * Math.cos(az)];
}

/** Inverso: punto a (x, y) km de `center` en los ejes de la grilla del motor. */
export function searchGridPoint(
  center: { lat: number; lon: number },
  xKm: number,
  yKm: number,
): { lat: number; lon: number } {
  if (isPolar(center.lat)) {
    const [cx, cy] = stereo(center.lat, center.lon);
    return stereoInverse(cx + xKm, cy + yKm, center.lat < 0);
  }
  const c = Math.hypot(xKm, yKm) / R_KM;
  const az = Math.atan2(xKm, yKm);
  const p1 = center.lat * RAD;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(c) + Math.cos(p1) * Math.sin(c) * Math.cos(az));
  const l2 =
    center.lon * RAD +
    Math.atan2(
      Math.sin(az) * Math.sin(c) * Math.cos(p1),
      Math.cos(c) - Math.sin(p1) * Math.sin(p2),
    );
  return { lat: p2 / RAD, lon: ((((l2 / RAD + 540) % 360) + 360) % 360) - 180 };
}
