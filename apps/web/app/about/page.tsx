/** Ruta /about — Owner: Producto/Diseño (ver docs/team/ROLES.md). Sección 12.1. */
import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = { title: "About" };

export default function Page() {
  return (
    <PageShell title="About">
      <p className="text-muted">
        Metodología, datos, atribuciones (NASA LRO/LOLA, NAIF, JPL Horizons, CSA), equipo y
        declaración de uso de IA.
      </p>
    </PageShell>
  );
}
