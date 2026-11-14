/** Ruta /compare — Owner: Frontend Analysis (ver docs/team/ROLES.md). Sección 12.1. */
import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { CompareTable } from "@/components/compare/compare-table";

export const metadata: Metadata = { title: "Compare" };

export default function Page() {
  return (
    <PageShell title="Compare">
      <CompareTable />
    </PageShell>
  );
}
