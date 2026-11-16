/**
 * Estados de `useAnalysis` en texto (rango inválido, error, en cola, cargando). Owner: Frontend Charts.
 * Mismos mensajes que HorizonPolar y VisibilityHeatmap; devuelve null cuando ya hay resultado.
 */
import type { ReactNode } from "react";

import type { useAnalysis } from "./use-analysis";

export function analysisStatus(a: ReturnType<typeof useAnalysis>, what: string): ReactNode {
  if (a.invalidRange) return <p className="text-sm text-bad">The date range is not valid.</p>;
  if (a.error) {
    return (
      <p role="alert" className="text-sm text-bad">
        Could not load the {what} for this site.
      </p>
    );
  }
  if (a.queued) {
    return <p className="text-sm text-muted">Computing the {what}… this can take a moment.</p>;
  }
  if (a.pending || !a.result) return <p className="text-sm text-muted">Loading {what}…</p>;
  return null;
}
