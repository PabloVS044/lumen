import { Color } from "cesium";

/** Color de Cesium a partir de un token de globals.css (p. ej. "--color-muted"). */
export function tokenColor(token: string) {
  return Color.fromCssColorString(
    getComputedStyle(document.documentElement).getPropertyValue(token).trim(),
  );
}
