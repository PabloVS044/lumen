"use client";

/**
 * ExportPanel — M14 Exportación (UI). Owner: Frontend Analysis (ver docs/team/ROLES.md; hoy R5).
 * HU-12: datos en CSV/JSON (AC1) y gráficos en SVG/PNG (AC2) se generan en el navegador desde el
 * resultado del motor; el informe PDF (AC3) lo construye ExportService.
 */
import { timestampDate } from "@bufbuild/protobuf/wkt";
import { useMutation } from "@connectrpc/connect-query";
import {
  ExportFormat,
  ExportService,
  isUnimplemented,
  type AnalysisResult,
  type AnalyzeRequest,
} from "@lumen/sdk";
import { Download } from "lucide-react";
import { useState } from "react";

import {
  download,
  exportName,
  metricsCsv,
  resultJson,
  seriesCsv,
  canvasToPng,
  svgMarkup,
  svgToPng,
} from "./export-model";

const button =
  "inline-flex min-h-11 items-center gap-2 rounded-md border border-surface px-3 text-sm hover:bg-surface";
type Chart =
  | { label: string; kind: "svg"; el: SVGSVGElement }
  | { label: string; kind: "canvas"; el: HTMLCanvasElement };

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export interface ExportPanelProps {
  result: AnalysisResult;
  request: AnalyzeRequest;
  /** Contenedor donde buscar los gráficos (svg con role="img", o ECharts sobre canvas). */
  chartsRoot: () => Element | null;
}

export function ExportPanel({ result, request, chartsRoot }: ExportPanelProps) {
  const [charts, setCharts] = useState<Chart[] | null>(null);
  const [notice, setNotice] = useState("");
  const pdf = useMutation(ExportService.method.createExport);

  const site = { lat: request.site?.lat ?? 0, lon: request.site?.lon ?? 0 };
  const startMs = request.range?.start ? timestampDate(request.range.start).getTime() : 0;
  const endMs = request.range?.end ? timestampDate(request.range.end).getTime() : 0;
  const name = (kind: string, ext: string) => exportName(site, startMs, endMs, kind, ext);
  const text = (body: string, type: string) => new Blob([body], { type });

  const background = () =>
    (typeof getComputedStyle === "function"
      ? getComputedStyle(document.documentElement).getPropertyValue("--color-space").trim()
      : "") || "#0b0e14";

  const findCharts = () => {
    const root = chartsRoot();
    // Gráficos con nombre; se ignora el role="img" interno que añade ECharts dentro de otro.
    const found: Chart[] = [];
    for (const el of root?.querySelectorAll('[role="img"][aria-label]') ?? []) {
      if (el.parentElement?.closest('[role="img"]')) continue;
      const label = el.getAttribute("aria-label")!;
      if (el instanceof SVGSVGElement) found.push({ label, kind: "svg", el });
      else {
        const canvas = el.querySelector("canvas");
        if (canvas) found.push({ label, kind: "canvas", el: canvas });
      }
    }
    setCharts(found);
  };

  const saveChart = async (c: Chart, format: "svg" | "png") => {
    if (c.kind === "canvas") {
      try {
        download(await canvasToPng(c.el, background()), name(slug(c.label), "png"));
      } catch (e) {
        setNotice(`Could not make the PNG: ${(e as Error).message}`);
      }
      return;
    }
    const markup = svgMarkup(c.el, background());
    if (format === "svg") {
      download(text(markup, "image/svg+xml"), name(slug(c.label), "svg"));
      return;
    }
    try {
      const [, , w = "800", h = "600"] = (c.el.getAttribute("viewBox") ?? "").split(/\s+/);
      download(await svgToPng(markup, Number(w), Number(h)), name(slug(c.label), "png"));
    } catch (e) {
      setNotice(`Could not make the PNG: ${(e as Error).message} Try SVG instead.`);
    }
  };

  return (
    <section aria-labelledby="export-title" className="flex flex-col gap-5">
      <h3 id="export-title" className="text-base font-semibold">
        Export
      </h3>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">
          Data for this site and period, as the engine computed it.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={button}
            onClick={() => download(text(seriesCsv(result), "text/csv"), name("series", "csv"))}
          >
            <Download aria-hidden className="size-4" />
            Series (CSV)
          </button>
          <button
            type="button"
            className={button}
            onClick={() => download(text(metricsCsv(result), "text/csv"), name("metrics", "csv"))}
          >
            <Download aria-hidden className="size-4" />
            Metrics (CSV)
          </button>
          <button
            type="button"
            className={button}
            onClick={() =>
              download(text(resultJson(result), "application/json"), name("analysis", "json"))
            }
          >
            <Download aria-hidden className="size-4" />
            Everything (JSON)
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">Charts on this page, as images.</p>
        <button type="button" className={`${button} self-start`} onClick={findCharts}>
          Find charts on this page
        </button>
        {charts &&
          (charts.length === 0 ? (
            <p className="text-sm text-muted">
              No chart has loaded on this page yet. Wait for the charts, then try again.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {charts.map((c) => (
                <li key={c.label} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="min-w-48">{c.label}</span>
                  {(c.kind === "svg" ? (["svg", "png"] as const) : (["png"] as const)).map((f) => (
                    <button
                      key={f}
                      type="button"
                      aria-label={`${c.label} as ${f.toUpperCase()}`}
                      className={button}
                      onClick={() => void saveChart(c, f)}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </li>
              ))}
            </ul>
          ))}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">
          A PDF report with every chart and metric, built by the engine.
        </p>
        <button
          type="button"
          className={`${button} self-start`}
          disabled={pdf.isPending}
          onClick={() => pdf.mutate({ analysis: request, format: ExportFormat.PDF })}
        >
          Request PDF report
        </button>
        {pdf.error ? (
          <p
            role="alert"
            className={isUnimplemented(pdf.error) ? "text-sm text-muted" : "text-sm text-bad"}
          >
            {isUnimplemented(pdf.error)
              ? "The engine cannot build PDF reports yet."
              : `Could not request the report: ${pdf.error.message}`}
          </p>
        ) : pdf.data?.downloadUrl ? (
          <a
            href={pdf.data.downloadUrl}
            className="text-sm text-earth underline underline-offset-4"
            download
          >
            Download the PDF report
          </a>
        ) : pdf.data ? (
          // ⚠️ Pendiente: seguir el job (JobsService) cuando R1 exponga el flujo de jobs en la UI.
          <p role="status" className="text-sm text-muted">
            The engine is preparing the report (job {pdf.data.jobId}).
          </p>
        ) : null}
      </div>

      <p role="status" className="text-sm text-bad empty:hidden">
        {notice}
      </p>
    </section>
  );
}
