"use client";

/**
 * PNG/SVG de los gráficos (M14, HU-12 AC2). Archivo compartido.
 * - ECharts: se re-renderiza la misma opción fuera de pantalla (SVG vectorial con el renderer SSR,
 *   PNG con canvas a 2×), así la exportación no depende del tamaño en pantalla.
 * - SVG propios (D3): se serializa el <svg> con los colores calculados incrustados, porque fuera
 *   de la página las variables CSS (tokens) no existen.
 */
import { CustomChart, HeatmapChart, LineChart, ScatterChart } from "echarts/charts";
import {
  AriaComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer, SVGRenderer } from "echarts/renderers";

echarts.use([
  HeatmapChart,
  CustomChart,
  LineChart,
  ScatterChart,
  AriaComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
  SVGRenderer,
]);

export const EXPORT_SIZE = { width: 1200, height: 600 };

const exportOption = (option: object, background: string) => ({
  ...option,
  animation: false,
  backgroundColor: background,
});

export function echartsToSvg(option: object, background: string, size = EXPORT_SIZE): string {
  const chart = echarts.init(null, null, { renderer: "svg", ssr: true, ...size });
  chart.setOption(exportOption(option, background));
  const svg = chart.renderToSVGString();
  chart.dispose();
  return svg;
}

export function echartsToPngDataUrl(
  option: object,
  background: string,
  size = EXPORT_SIZE,
): string {
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${size.width}px;height:${size.height}px`;
  document.body.appendChild(host);
  try {
    const chart = echarts.init(host, null, { renderer: "canvas", ...size });
    chart.setOption(exportOption(option, background));
    const url = chart.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: background });
    chart.dispose();
    return url;
  } finally {
    host.remove();
  }
}

const INLINE_PROPS = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-opacity",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "text-anchor",
  "dominant-baseline",
];

/** Copia autosuficiente de un <svg>: colores calculados incrustados y fondo explícito. */
export function svgElementToString(svg: SVGSVGElement, background: string): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const src = [svg, ...svg.querySelectorAll("*")];
  const dst = [clone, ...clone.querySelectorAll("*")];
  src.forEach((el, i) => {
    const style = getComputedStyle(el);
    const target = dst[i] as SVGElement | undefined;
    if (!target) return;
    for (const prop of INLINE_PROPS) {
      const value = style.getPropertyValue(prop);
      if (value) target.style.setProperty(prop, value);
    }
  });
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const box = svg.viewBox?.baseVal;
  const rect = clone.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", String(box?.x ?? 0));
  rect.setAttribute("y", String(box?.y ?? 0));
  rect.setAttribute("width", box?.width ? String(box.width) : "100%");
  rect.setAttribute("height", box?.height ? String(box.height) : "100%");
  rect.setAttribute("fill", background);
  clone.insertBefore(rect, clone.firstChild);
  return new XMLSerializer().serializeToString(clone);
}

/** PNG a partir de un SVG serializado (dibujado en un canvas a 2×). */
export async function svgStringToPngDataUrl(svgText: string, width: number, height: number) {
  const url = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available");
    ctx.scale(2, 2);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
