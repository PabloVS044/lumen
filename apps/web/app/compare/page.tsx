/** Ruta /compare — Owner: Frontend Analysis (ver docs/team/ROLES.md; hoy R5). Sección 12.1, HU-04. */
import type { Metadata } from "next";
import { Suspense } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { pageMetadata } from "@/lib/seo";

import { CompareView } from "./compare-view";

// Canonical sin parámetros (sitios/fechas): todas las variantes son la misma página.
export const metadata: Metadata = pageMetadata({
  title: "Compare",
  description: "Compare sunlight and Earth contact for up to four sites or landing dates.",
  path: "/compare",
});

export default function Page() {
  return (
    <PageShell title="Compare">
      {/* nuqs lee la URL: con Cache Components debe ir dentro de Suspense. */}
      <Suspense fallback={<p className="text-sm text-muted">Loading comparison…</p>}>
        <CompareView />
      </Suspense>
    </PageShell>
  );
}
