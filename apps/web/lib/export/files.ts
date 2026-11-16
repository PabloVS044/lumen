/**
 * Exportación en el navegador (M14, HU-12). Archivo compartido. Sin servidor: CSV/JSON/PNG/SVG se
 * generan con los datos que la página ya tiene. El PDF del motor necesita `ExportService` (R1).
 */

export type Cell = string | number | boolean | null | undefined;

const escape = (v: Cell): string => {
  if (v === null || v === undefined) return "";
  const s = typeof v === "number" ? String(v) : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

/** CSV (RFC 4180): separador coma, fin de línea CRLF, comillas solo cuando hacen falta. */
export function toCsv(headers: string[], rows: Cell[][]): string {
  return [headers, ...rows].map((r) => r.map(escape).join(",")).join("\r\n") + "\r\n";
}

/** Nombre de archivo portable: sin espacios, barras ni comas. */
export function safeFilename(name: string): string {
  return name
    .trim()
    .replace(/[/\\,:]+/g, "_")
    .replace(/\s+/g, "-")
    .replace(/[^\w.\-]/g, "");
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadText(filename: string, text: string, mime: string): void {
  downloadBlob(filename, new Blob([text], { type: `${mime};charset=utf-8` }));
}

export function downloadDataUrl(filename: string, dataUrl: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
