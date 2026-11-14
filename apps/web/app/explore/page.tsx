/** Ruta /explore — Owner: Frontend 3D (ver docs/team/ROLES.md). Sección 12.1. */
import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { GlobeLoader } from "@/components/globe/globe-loader";
import { SitePicker } from "@/components/site-picker/site-picker";
import { TimeControls } from "@/components/time-controls/time-controls";

export const metadata: Metadata = { title: "Explore" };

export default function Page() {
  return (
    <PageShell title="Explore">
      <SitePicker />
      <GlobeLoader />
      <TimeControls />
    </PageShell>
  );
}
