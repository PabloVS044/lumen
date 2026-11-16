/**
 * CompareTable — M5/M6 Comparador. Owner: Frontend Analysis (ver docs/team/ROLES.md; hoy R5).
 * Especificación: sección 12.2 y HU-04. Columnas = escenarios (sitio + fechas), filas = métricas.
 * El mejor valor de cada fila lleva la palabra "Best" e icono, no solo color (12.5).
 */
import type { AnalysisResult } from "@lumen/sdk";
import { Trophy } from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/utils";

import { bestIndices, COMPARE_ROWS } from "./compare-model";
import { MiniHeatmap, MiniPolar } from "./mini-charts";

export interface CompareColumn {
  id: string;
  label: string;
  /** Coordenadas y fechas en texto. */
  detail: string;
  color: string;
  result: AnalysisResult;
}

const cell = "px-3 py-3 text-right align-top first:pl-4 last:pr-4";

export function CompareTable({ columns }: { columns: CompareColumn[] }) {
  const captionId = useId();
  return (
    <div
      role="region"
      aria-labelledby={captionId}
      tabIndex={0}
      // relative: contiene los textos sr-only (absolutos) para que el recorte del scroll los incluya.
      className="relative overflow-x-auto rounded-lg border border-surface bg-panel"
    >
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        <caption id={captionId} className="sr-only">
          Comparison of {columns.length} scenarios
        </caption>
        <thead>
          <tr className="border-b border-surface">
            <th scope="col" className="px-4 py-3 text-left text-xs font-normal text-muted">
              Metric
            </th>
            {columns.map((c) => (
              <th key={c.id} scope="col" className={cn(cell, "font-normal")}>
                <span className="flex items-center justify-end gap-2 font-semibold text-text">
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.label}
                </span>
                <span className="block font-mono text-xs text-muted">{c.detail}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARE_ROWS.map((row) => {
            const values = columns.map((c) =>
              c.result.metrics ? row.get(c.result.metrics) : undefined,
            );
            const best = new Set(bestIndices(values, row.better));
            return (
              <tr key={row.key} className="border-b border-surface/60">
                <th scope="row" className="px-4 py-3 text-left font-normal">
                  {row.label}
                  <span className="block text-xs text-muted">
                    {row.better === "high" ? "Higher is better" : "Lower is better"}
                  </span>
                </th>
                {values.map((v, i) => (
                  <td
                    key={columns[i]!.id}
                    className={cn(cell, "font-mono tabular-nums", best.has(i) && "font-semibold")}
                  >
                    {v === undefined ? <span className="text-muted">—</span> : row.format(v)}
                    {best.has(i) && (
                      <span className="mt-1 flex items-center justify-end gap-1 font-sans text-xs text-good">
                        <Trophy aria-hidden className="size-3.5" />
                        Best
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
          <tr className="border-b border-surface/60">
            <th scope="row" className="px-4 py-3 text-left font-normal">
              Horizon and sky paths
            </th>
            {columns.map((c) => (
              <td key={c.id} className={cell}>
                <MiniPolar result={c.result} name={c.label} />
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="px-4 py-3 text-left font-normal">
              Sunlight and Earth together, hour by hour
              <span className="block text-xs text-muted">Rows are days, columns UTC hours</span>
            </th>
            {columns.map((c) => (
              <td key={c.id} className={cell}>
                <MiniHeatmap result={c.result} name={c.label} />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
