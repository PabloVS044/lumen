/** Ruta /explore — Owner: Frontend 3D (ver docs/team/ROLES.md). Sección 12.1. */
import type { Metadata } from "next";
import { Suspense } from "react";

import { ExploreView } from "./explore-view";

export const metadata: Metadata = { title: "Explore" };

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted">Loading explorer…</p>}>
      <ExploreView />
    </Suspense>
  );
}
