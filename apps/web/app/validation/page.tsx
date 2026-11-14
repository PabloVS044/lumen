/** Ruta /validation — Owner: Producto/Diseño + Efemérides/Ciencia (ver docs/team/ROLES.md). Sección 12.1. */
import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = { title: "Validation" };

export default function Page() {
  return (
    <PageShell title="Validation">
      <p className="text-muted">
        M15 Validación contra JPL Horizons y mapas publicados (pendiente).
      </p>
    </PageShell>
  );
}
