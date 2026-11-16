/**
 * Comparación Tierra vs Luna de /learn (HU-11 AC3): altura del Sol a mediodía. Owner: Producto/Diseño.
 * Modelo didáctico en terreno plano y sin atmósfera; las cifras de sitios reales salen del motor.
 */

/** Latitud subsolar máxima en la Tierra: oblicuidad de la eclíptica (23.439° en J2000). */
export const EARTH_MAX_SUBSOLAR_LAT_DEG = 23.44;
/** Latitud subsolar máxima en la Luna, medida con el motor (SPICE DE440, 2026–2045; sección 4.1). */
export const MOON_MAX_SUBSOLAR_LAT_DEG = 1.59;

/**
 * Elevación del Sol a mediodía en la latitud dada: la más alta y la más baja del año. El Sol está a
 * 90° − |latitud − latitud subsolar|, y la latitud subsolar recorre ±maxSubsolarLatDeg. Una mínima
 * negativa significa que en esa época el Sol no sale ni a mediodía.
 */
export function noonSunRange(
  latDeg: number,
  maxSubsolarLatDeg: number,
): { highest: number; lowest: number } {
  const lat = Math.abs(latDeg);
  return {
    highest: 90 - Math.max(0, lat - maxSubsolarLatDeg),
    lowest: 90 - (lat + maxSubsolarLatDeg),
  };
}
