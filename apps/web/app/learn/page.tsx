/** Ruta /learn — Owner: Producto/Diseño (ver docs/team/ROLES.md). Sección 12.1. */
import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { Tour } from "@/components/learn/tour";
import { pageMetadata } from "@/lib/seo";

// Hoy es un marcador de posición (Tour pendiente, M11): noindex y fuera del sitemap hasta que exista contenido.
export const metadata: Metadata = {
  ...pageMetadata({
    title: "Learn",
    description: "Guided explainer mode for LUMEN (coming soon).",
    path: "/learn",
  }),
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <PageShell title="Learn">
      <Tour />
    </PageShell>
  );
}
