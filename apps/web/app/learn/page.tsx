/** Ruta /learn — Owner: Producto/Diseño (ver docs/team/ROLES.md). Sección 12.1. */
import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { Tour } from "@/components/learn/tour";

export const metadata: Metadata = { title: "Learn" };

export default function Page() {
  return (
    <PageShell title="Learn">
      <Tour />
    </PageShell>
  );
}
