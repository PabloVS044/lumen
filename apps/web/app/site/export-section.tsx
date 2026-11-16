"use client";

/** Exportación de /site (M14, HU-12): datos y gráficos de la página. Owner: Frontend Analysis. */
import { create } from "@bufbuild/protobuf";
import { AnalyzeRequestSchema } from "@lumen/sdk";

import { ExportPanel } from "@/components/export/export-panel";
import { analysisStatus } from "@/components/horizon/analysis-status";
import {
  analysisInput,
  useAnalysis,
  type RangeProp,
  type SiteProp,
} from "@/components/horizon/use-analysis";

export function ExportSection({ site, range }: { site: SiteProp; range: RangeProp }) {
  const analysis = useAnalysis(site, range);
  const input = analysisInput(site, range);
  return (
    <details className="rounded-lg border border-surface bg-panel p-4">
      <summary className="min-h-11 cursor-pointer content-center text-sm font-medium">
        Export data and charts
      </summary>
      <div className="mt-4">
        {analysisStatus(analysis, "analysis") ??
          (input && (
            <ExportPanel
              result={analysis.result!}
              request={create(AnalyzeRequestSchema, input)}
              chartsRoot={() => document.querySelector("main")}
            />
          ))}
      </div>
    </details>
  );
}
