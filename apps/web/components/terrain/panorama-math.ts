/**
 * Proyección de la vista a ras de suelo (M10, sección 12.2). Owner: Frontend 3D.
 * Cámara a nivel (pitch 0), proyección rectilínea: la misma que usa Cesium con su FOV horizontal,
 * así el horizonte del motor dibujado en SVG encaja con el tileset de fondo. Azimut desde el norte, horario.
 */
export interface HorizonMaskLike {
  azStepDeg: number;
  elevationDeg: number[];
}

export interface View {
  /** Azimut hacia el que mira la cámara. */
  heading: number;
  /** FOV horizontal en grados. */
  fovDeg: number;
  width: number;
  height: number;
}

const rad = (d: number) => (d * Math.PI) / 180;

export const wrapDeg = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

const focal = (v: View) => v.width / 2 / Math.tan(rad(v.fovDeg / 2));

export function project(dir: { az: number; el: number }, v: View) {
  const delta = rad(wrapDeg(dir.az - v.heading));
  const f = focal(v);
  const cos = Math.cos(delta);
  return {
    inFront: cos > 0,
    x: v.width / 2 + f * Math.tan(delta),
    y: v.height / 2 - (f * Math.tan(rad(dir.el))) / cos,
  };
}

/** Elevación del horizonte del motor en `az` (interpolación lineal, circular). */
export function horizonAt(mask: HorizonMaskLike, az: number) {
  const n = mask.elevationDeg.length;
  if (n === 0) return undefined;
  const pos = (((az % 360) + 360) % 360) / mask.azStepDeg;
  const i = Math.floor(pos);
  const a = mask.elevationDeg[i % n]!;
  const b = mask.elevationDeg[(i + 1) % n]!;
  return a + (b - a) * (pos - i);
}

/** Perfil del horizonte del motor sobre el ancho de la imagen: `columns + 1` puntos, de izquierda a derecha. */
export function horizonProfile(mask: HorizonMaskLike, v: View, columns = 120) {
  const half = v.fovDeg / 2;
  const f = focal(v);
  return Array.from({ length: columns + 1 }, (_, i) => {
    const x = (v.width * i) / columns;
    const delta = Math.atan((x - v.width / 2) / f); // ángulo horizontal de la columna
    const az = v.heading + (delta * 180) / Math.PI;
    const el = horizonAt(mask, az) ?? 0;
    return { x, y: project({ az, el }, v).y, az, el, edge: Math.abs(delta) <= rad(half) + 1e-9 };
  });
}

/** Elevación mínima y máxima del horizonte dentro del campo de visión. */
export function viewHorizonRange(mask: HorizonMaskLike, v: View) {
  const els = horizonProfile(mask, v, 60).map((p) => p.el);
  return els.length ? { min: Math.min(...els), max: Math.max(...els) } : undefined;
}

/** Radio en píxeles de un disco de `diameterDeg` (Sol 0.53°, Tierra 1.9°). */
export const discRadiusPx = (diameterDeg: number, v: View) =>
  focal(v) * Math.tan(rad(diameterDeg / 2));

interface BodyNow {
  az: number;
  el: number;
  visible: boolean;
}

const f1 = (n: number) => n.toFixed(1);

/** Resumen en texto de la vista (sección 12.5). */
export function panoramaSummary(i: {
  heading: number;
  horizon?: { min: number; max: number };
  now?: { time: string; sun: BodyNow; earth: BodyNow };
}) {
  const body = (name: string, b: BodyNow) =>
    `the ${name} is at azimuth ${f1(b.az)}°, elevation ${f1(b.el)}° (${b.visible ? "above" : "below"} the terrain horizon)`;
  const parts = [
    `Looking toward azimuth ${f1(i.heading)}°.`,
    i.horizon
      ? `The terrain horizon in view rises from ${f1(i.horizon.min)}° to ${f1(i.horizon.max)}° elevation.`
      : "",
    i.now
      ? `At ${i.now.time} UTC ${body("Sun", i.now.sun)} and ${body("Earth", i.now.earth)}.${
          i.now.sun.visible ? "" : " The site is in shadow."
        }`
      : "",
  ];
  return parts.filter(Boolean).join(" ");
}
