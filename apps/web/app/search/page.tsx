/** Ruta /search — Owner: Frontend Analysis (issue #41). Secciones 9.10 y 12.1. */
import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";

import { BestSpotSearch } from "./best-spot-search";

export const metadata: Metadata = { title: "Best spot" };

export default function Page() {
  return (
    <PageShell title="Best spot">
      <BestSpotSearch />
    </PageShell>
  );
}
