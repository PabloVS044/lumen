import { Color } from "cesium";

/** Color de Cesium a partir de un token de globals.css (p. ej. "--color-muted"). */
export function tokenColor(token: string) {
  return Color.fromCssColorString(
    getComputedStyle(document.documentElement).getPropertyValue(token).trim(),
  );
}

/** Color de Cesium desde un valor CSS o un `var(--token)`, como los colores de sitio del store. */
export function cssColor(value: string) {
  const token = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
  return token ? tokenColor(token) : Color.fromCssColorString(value);
}
