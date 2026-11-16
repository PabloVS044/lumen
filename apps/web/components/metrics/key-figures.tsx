"use client";

/**
 * Cifras clave de la cabecera de /site (sección 12.1). Owner: Frontend Charts.
 * Solo lo que calcula el motor; misma consulta que el resto de gráficos (`useAnalysis`).
 */
import { analysisStatus } from "@/components/horizon/analysis-status";
import { useAnalysis, type RangeProp, type SiteProp } from "@/components/horizon/use-analysis";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

export function KeyFigures({ site, range }: { site: SiteProp; range: RangeProp }) {
  const analysis = useAnalysis(site, range);
  const status = analysisStatus(analysis, "key figures");
  if (status) return status;
  const m = analysis.result!.metrics;
  if (!m) return null;
  const cut = m.longestDarkInterval?.truncated ?? false;
  const figures = [
    { label: "Sunlight", value: `${Math.round(m.illuminationPct)}%`, tone: "text-sun" },
    { label: "Earth in view", value: `${Math.round(m.earthVisiblePct)}%`, tone: "text-earth" },
    { label: "Both at once", value: `${Math.round(m.operablePct)}%`, tone: "text-text" },
    {
      label: "Longest dark period",
      value: `${cut ? "≥ " : ""}${formatDuration(m.longestDarkH)}`,
      tone: "text-text",
    },
  ];
  return (
    <dl aria-label="Key figures" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {figures.map((f) => (
        <div key={f.label} className="rounded-lg border border-surface bg-panel p-3">
          <dt className="text-xs text-muted">{f.label}</dt>
          <dd className={cn("font-mono text-2xl tabular-nums", f.tone)}>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
