/** Ruta /search — Owner: Frontend Analysis (issue #41). Secciones 9.10 y 12.1. */
import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { pageMetadata } from "@/lib/seo";

import { BestSpotSearch } from "./best-spot-search";

// Canonical sin parámetros de búsqueda: todas las variantes son la misma página.
export const metadata: Metadata = pageMetadata({
  title: "Best spot",
  description:
    "Search around a point for the nearby spot with the best sunlight and Earth contact over a date range.",
  path: "/search",
});

export default function Page() {
  return (
    <PageShell title="Best spot">
      <BestSpotSearch />
    </PageShell>
  );
}
