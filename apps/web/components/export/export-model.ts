/**
 * Exportación en el navegador (M14, HU-12 AC1–AC2). Owner: Frontend Analysis (R6, hoy R5).
 * Los datos son los del motor tal cual: CSV con nombres del proto, JSON con el mapeo JSON del proto.
 * El PDF (AC3) lo genera el motor (ExportService).
 */
import { toJsonString } from "@bufbuild/protobuf";
import { timestampDate } from "@bufbuild/protobuf/wkt";
import { AnalysisResultSchema, type AnalysisResult } from "@lumen/sdk";

const SVG_NS = "http://www.w3.org/2000/svg";

const SERIES_COLUMNS = [
  "time_utc",
  "sun_az_deg",
  "sun_el_deg",
  "sun_fraction",
  "earth_az_deg",
  "earth_el_deg",
  "earth_fraction",
  "horizon_at_sun_deg",
  "horizon_at_earth_deg",
  "eclipse_fraction",
  "sun_visible",
  "earth_visible",
  "operable",
];

const cell = (v: unknown) => (v === undefined || v === null ? "" : String(v));

export function seriesCsv(r: AnalysisResult): string {
  const s = r.series;
  if (!s) return `${SERIES_COLUMNS.join(",")}\n`;
  const rows = s.time.map((t, i) =>
    [
      timestampDate(t).toISOString(),
      s.sun?.azDeg[i],
      s.sun?.elDeg[i],
      s.sun?.fraction[i],
      s.earth?.azDeg[i],
      s.earth?.elDeg[i],
      s.earth?.fraction[i],
      s.horizonAtSunDeg[i],
      s.horizonAtEarthDeg[i],
      s.eclipseFraction[i],
      s.sunVisible[i],
      s.earthVisible[i],
      s.operable[i],
    ]
      .map(cell)
      .join(","),
  );
  return `${[SERIES_COLUMNS.join(","), ...rows].join("\n")}\n`;
}

/** Métricas escalares con su nombre del proto (sección 9.6). */
export function metricsCsv(r: AnalysisResult): string {
  const m = r.metrics;
  if (!m) return "metric,value\n";
  const json = JSON.parse(
    toJsonString(AnalysisResultSchema, r, { useProtoFieldName: true, alwaysEmitImplicit: true }),
  ) as { metrics: Record<string, unknown> };
  const rows = Object.entries(json.metrics)
    .filter(([, v]) => typeof v !== "object")
    .map(([k, v]) => `${k},${cell(v)}`);
  const dark = m.longestDarkInterval;
  if (dark?.start && dark.end) {
    rows.push(`longest_dark_start_utc,${timestampDate(dark.start).toISOString()}`);
    rows.push(`longest_dark_end_utc,${timestampDate(dark.end).toISOString()}`);
    rows.push(`longest_dark_truncated,${dark.truncated}`);
  }
  return `${["metric,value", ...rows].join("\n")}\n`;
}

export const resultJson = (r: AnalysisResult) =>
  toJsonString(AnalysisResultSchema, r, { prettySpaces: 2, alwaysEmitImplicit: true });

export function exportName(
  site: { lat: number; lon: number },
  startMs: number,
  endMs: number,
  kind: string,
  ext: string,
) {
  const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return `lumen_${site.lat.toFixed(3)}_${site.lon.toFixed(3)}_${day(startMs)}_${day(endMs)}_${kind}.${ext}`;
}

const STYLE_PROPS = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-opacity",
  "stroke-width",
  "stroke-dasharray",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
] as const;

/**
 * SVG autónomo: copia los estilos calculados (los colores vienen de tokens CSS de la app), añade
 * tamaño, xmlns y un fondo, para que el archivo se vea igual fuera de LUMEN.
 */
export function svgMarkup(svg: SVGSVGElement, background: string): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const src = [svg, ...svg.querySelectorAll("*")];
  const dst = [clone, ...clone.querySelectorAll("*")];
  src.forEach((el, i) => {
    const cs = typeof getComputedStyle === "function" ? getComputedStyle(el) : null;
    const target = dst[i] as Element;
    if (!cs) return;
    for (const p of STYLE_PROPS) {
      const v = cs.getPropertyValue(p);
      if (v) target.setAttribute(p, v);
    }
    target.removeAttribute("class");
  });
  const [, , w = "800", h = "600"] = (svg.getAttribute("viewBox") ?? "0 0 800 600").split(/\s+/);
  const [x0 = "0", y0 = "0"] = (svg.getAttribute("viewBox") ?? "0 0").split(/\s+/);
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("width", w);
  clone.setAttribute("height", h);
  const bg = document.createElementNS(SVG_NS, "rect");
  bg.setAttribute("x", x0);
  bg.setAttribute("y", y0);
  bg.setAttribute("width", w);
  bg.setAttribute("height", h);
  bg.setAttribute("fill", background);
  clone.insertBefore(bg, clone.firstChild);
  return new XMLSerializer().serializeToString(clone);
}

/** PNG a 2× a partir del SVG autónomo. Solo navegador (canvas). */
export async function svgToPng(markup: string, width: number, height: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Could not encode the PNG."))),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** PNG de un gráfico ECharts (canvas) sobre el fondo de la app; el canvas es transparente. */
export async function canvasToPng(src: HTMLCanvasElement, background: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(src, 0, 0);
  return await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode the PNG."))),
      "image/png",
    ),
  );
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
