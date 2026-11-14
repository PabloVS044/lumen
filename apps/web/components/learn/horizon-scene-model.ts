/**
 * Modelo de la ilustración del hero (landing y /learn). Owner: Producto/Diseño.
 * Horizonte desplegado de un sitio ficticio cerca del polo sur: el Sol rodea el horizonte en un día
 * lunar y la Tierra oscila cerca del norte por la libración. Es un esquema didáctico con relieve
 * inventado: NO representa ningún sitio ni sale del motor. Los datos reales vienen de @lumen/sdk.
 * Tamaños angulares y periodos: sección 4.8 del documento técnico.
 */

export const SCENE = { width: 1200, height: 300, horizonY: 190, pxPerDeg: 26 } as const;

/** Radio angular del disco solar (diámetro ≈ 0.53°). */
export const SUN_RADIUS_DEG = 0.265;
/** Radio angular del disco terrestre visto desde la Luna (diámetro ≈ 1.9°). */
export const EARTH_RADIUS_DEG = 0.95;
/** Mes sinódico: un día lunar. */
export const LUNAR_DAY_D = 29.53;
/** Mes draconítico: ciclo de la libración en latitud. */
export const DRACONIC_MONTH_D = 27.21;
/** Mes anomalístico: ciclo de la libración en longitud. */
export const ANOMALISTIC_MONTH_D = 27.55;

export interface SkyPosition {
  /** Azimut desde el norte, sentido horario, en [0, 360). */
  az: number;
  /** Elevación sobre el plano tangente local. */
  el: number;
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const wrap360 = (deg: number) => ((deg % 360) + 360) % 360;

/** Eje X centrado en el norte: S (0) → W → N (centro) → E → S (ancho). */
export function azToX(azDeg: number): number {
  return (wrap360(azDeg - 180) / 360) * SCENE.width;
}

export function elToY(elDeg: number): number {
  return SCENE.horizonY - elDeg * SCENE.pxPerDeg;
}

/** Perfil de relieve ilustrativo (grados), periódico en azimut. */
export function terrainElevation(azDeg: number): number {
  const a = rad(azDeg);
  return (
    0.25 +
    0.95 * Math.sin(2 * a - 0.6) +
    0.7 * Math.sin(5 * a + 4.2) +
    0.4 * Math.sin(11 * a + 0.3) +
    0.2 * Math.sin(23 * a + 2.2)
  );
}

/**
 * Sol tras `days` días: rota hacia el oeste (azimut decreciente) una vuelta por día lunar y sube
 * algo más hacia el norte, como en un sitio a unas décimas de grado del polo.
 */
export function sunAt(days: number): SkyPosition {
  const az = wrap360(90 - (360 * days) / LUNAR_DAY_D);
  return { az, el: 0.8 + 0.8 * Math.cos(rad(az)) };
}

/** Tierra tras `days` días: cerca del norte, con libración en longitud (az) y latitud (el). */
export function earthAt(days: number): SkyPosition {
  const az = wrap360(6 * Math.sin((2 * Math.PI * days) / ANOMALISTIC_MONTH_D));
  const el = 0.6 + 3.2 * Math.sin((2 * Math.PI * days) / DRACONIC_MONTH_D + 0.8);
  return { az, el };
}

/**
 * Fracción del disco por encima del relieve en su azimut (segmento circular; relieve plano a lo
 * ancho del disco). Misma idea que la sección 9.5, simplificada para la ilustración.
 */
export function visibleFraction(body: SkyPosition, radiusDeg: number): number {
  const u = (terrainElevation(body.az) - body.el) / radiusDeg;
  if (u <= -1) return 1;
  if (u >= 1) return 0;
  return (Math.acos(u) - u * Math.sqrt(1 - u * u)) / Math.PI;
}

function ridgePoints(step: number): string {
  const points: string[] = [];
  for (let x = 0; x <= SCENE.width; x += step) {
    const az = 180 + (x / SCENE.width) * 360;
    points.push(`${x},${elToY(terrainElevation(az)).toFixed(1)}`);
  }
  return points.join(" L");
}

/** Path SVG de la línea de cresta, de borde a borde. */
export function ridgePath(step = 2): string {
  return `M${ridgePoints(step)}`;
}

/** Path SVG del relieve, relleno hasta el borde inferior de la escena. */
export function terrainPath(step = 2): string {
  return `M0,${SCENE.height} L${ridgePoints(step)} L${SCENE.width},${SCENE.height} Z`;
}
