/** Ruta /site — Owner: Frontend Charts (ver docs/team/ROLES.md). Sección 12.1. */
import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { Countdowns } from "@/components/metrics/countdowns";
import { MetricsPanel } from "@/components/metrics/metrics-panel";

import { SiteCharts } from "./site-charts";

export const metadata: Metadata = { title: "Site detail" };

export default function Page() {
  return (
    <PageShell title="Site detail">
      <MetricsPanel />
      <Countdowns />
      <SiteCharts />
    </PageShell>
  );
}
