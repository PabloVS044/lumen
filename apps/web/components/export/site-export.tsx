"use client";

/**
 * Exportación del análisis del sitio (M14, HU-12). Owner: Frontend Analysis (issue #43).
 * AC1: CSV de la serie y de las métricas, JSON completo (formato canónico del contrato).
 * AC3: PDF desde el navegador (imprimir → guardar como PDF). El PDF del motor necesita
 * `ExportService` (R1), aún sin implementar.
 */
import { useAnalysis, type RangeProp, type SiteProp } from "@/components/horizon/use-analysis";
import {
  ANALYSIS_CSV_HEADERS,
  analysisCsvRows,
  analysisJson,
  metricsCsvRows,
} from "@/lib/export/analysis";
import { downloadText, safeFilename, toCsv } from "@/lib/export/files";

const buttonClass =
  "rounded-md border border-surface px-3 py-1.5 text-sm hover:border-muted disabled:opacity-50";

export function SiteExport({ site, range }: { site: SiteProp; range: RangeProp }) {
  const { result } = useAnalysis(site, range);
  const base = safeFilename(`lumen site ${site.lat} ${site.lon} ${range.start} ${range.end}`);
  const ready = Boolean(result);

  return (
    <section aria-labelledby="site-export-title" className="flex flex-col gap-2" data-print-hide>
      <h2 id="site-export-title" className="text-sm font-medium">
        Export
      </h2>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          disabled={!ready}
          onClick={() =>
            result &&
            downloadText(
              `${base}-series.csv`,
              toCsv(ANALYSIS_CSV_HEADERS, analysisCsvRows(result)),
              "text/csv",
            )
          }
        >
          Time series (CSV)
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={!ready}
          onClick={() =>
            result &&
            downloadText(
              `${base}-metrics.csv`,
              toCsv(["metric", "value"], metricsCsvRows(result)),
              "text/csv",
            )
          }
        >
          Metrics (CSV)
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={!ready}
          onClick={() =>
            result && downloadText(`${base}.json`, analysisJson(result), "application/json")
          }
        >
          Full result (JSON)
        </button>
        <button type="button" className={buttonClass} onClick={() => window.print()}>
          Print or save as PDF
        </button>
      </div>
      {!ready && (
        <p className="text-xs text-muted">Data exports are available once the analysis loads.</p>
      )}
    </section>
  );
}
