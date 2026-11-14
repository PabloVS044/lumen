/** Ruta /search — Owner: Frontend Analysis (ver docs/team/ROLES.md). Sección 12.1. */
import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = { title: "Best spot" };

export default function Page() {
  return (
    <PageShell title="Best spot">
      <p className="text-muted">M12 Buscador de mejor punto (pendiente).</p>
    </PageShell>
  );
}
