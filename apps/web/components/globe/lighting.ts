/**
 * Geometría de iluminación del globo (sección 9.11). Owner: Frontend 3D.
 * Funciones puras, vectores en MOON_ME. El globo está fijo en ese marco, así que se usan tal cual.
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const len = (v: Vec3) => Math.hypot(v.x, v.y, v.z);
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const normalize = (v: Vec3): Vec3 => {
  const l = len(v);
  return { x: v.x / l, y: v.y / l, z: v.z / l };
};

/** Interpolación esférica entre dos direcciones unitarias. */
export function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const omega = Math.acos(Math.min(1, Math.max(-1, dot(a, b))));
  if (omega < 1e-9) return a;
  const sa = Math.sin((1 - t) * omega) / Math.sin(omega);
  const sb = Math.sin(t * omega) / Math.sin(omega);
  return { x: sa * a.x + sb * b.x, y: sa * a.y + sb * b.y, z: sa * a.z + sb * b.z };
}

/** Círculo máximo a 90° del Sol: puntos con elevación solar 0 sobre una esfera de `radiusM`. */
export function terminatorRing(sun: Vec3, radiusM: number, segments = 180): Vec3[] {
  const s = normalize(sun);
  const helper = Math.abs(s.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
  const u = normalize(cross(s, helper));
  const v = cross(s, u);
  return Array.from({ length: segments + 1 }, (_, i) => {
    const a = (2 * Math.PI * i) / segments;
    const c = Math.cos(a) * radiusM;
    const d = Math.sin(a) * radiusM;
    return { x: c * u.x + d * v.x, y: c * u.y + d * v.y, z: c * u.z + d * v.z };
  });
}

/** Punto de la superficie en el cenit de la dirección dada. lon en [-180, 180). */
export function subpoint(dir: Vec3) {
  const d = normalize(dir);
  const latDeg = (Math.asin(d.z) * 180) / Math.PI;
  const lon = (Math.atan2(d.y, d.x) * 180) / Math.PI;
  return { latDeg, lonDeg: ((((lon + 180) % 360) + 360) % 360) - 180 };
}

/** Hora entera anterior a `t` y fracción transcurrida dentro de esa hora. */
export function hourSplit(t: Date) {
  const start = new Date(Math.floor(t.getTime() / 3_600_000) * 3_600_000);
  return { start, frac: (t.getTime() - start.getTime()) / 3_600_000 };
}
