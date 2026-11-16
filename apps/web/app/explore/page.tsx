/** Ruta /explore — Owner: Frontend 3D (ver docs/team/ROLES.md). Sección 12.1. */
import type { Metadata } from "next";
import { Suspense } from "react";

import { pageMetadata } from "@/lib/seo";

import { ExploreView } from "./explore-view";

export const metadata: Metadata = pageMetadata({
  title: "Explore the Moon",
  description:
    "Pick a point on a 3D Moon, mostly the south pole, and see when the Sun and Earth are above its real terrain horizon over a date range.",
  path: "/explore",
});

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted">Loading explorer…</p>}>
      <ExploreView />
    </Suspense>
  );
}
