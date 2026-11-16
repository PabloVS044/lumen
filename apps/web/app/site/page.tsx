/** Ruta /site — Owner: Frontend Charts (ver docs/team/ROLES.md). Sección 12.1, estado en URL 12.3. */
import type { Metadata } from "next";
import { Suspense } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { pageMetadata } from "@/lib/seo";

import { SiteView } from "./site-view";

// Canonical sin parámetros (lat/lon/fechas): todas las variantes son la misma página.
export const metadata: Metadata = pageMetadata({
  title: "Site detail",
  description: "Sunlight and Earth visibility over the real horizon of any point on the Moon.",
  path: "/site",
});

export default function Page() {
  return (
    <PageShell title="Site detail">
      {/* nuqs lee la URL: con Cache Components debe ir dentro de Suspense. */}
      <Suspense fallback={<p className="text-sm text-muted">Loading site…</p>}>
        <SiteView />
      </Suspense>
    </PageShell>
  );
}
