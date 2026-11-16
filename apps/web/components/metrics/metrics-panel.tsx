"use client";

/**
 * MetricsPanel — M7 Métricas. Owner: Frontend Charts (ver docs/team/ROLES.md).
 * Especificación: secciones 9.6 y 12.2. Solo muestra lo que calcula el motor (AnalysisResult.metrics).
 * Mismo patrón que HorizonPolar: recibe {site, range} y comparte la consulta de `useAnalysis`.
 */
import { timestampDate } from "@bufbuild/protobuf/wkt";
import type { AnalysisResult, Metrics } from "@lumen/sdk";

import { analysisStatus } from "@/components/horizon/analysis-status";
import { useAnalysis, type RangeProp, type SiteProp } from "@/components/horizon/use-analysis";
import { formatDeg, formatDuration, formatUtc } from "@/lib/format";
import { cn } from "@/lib/utils";

const pct = (v: number) => `${v.toFixed(1)}%`;

interface Item {
  label: string;
  value: string;
  note?: string;
}

function sunlight(m: Metrics): Item[] {
  const cut = m.longestDarkInterval?.truncated ?? false;
  const items: Item[] = [
    { label: "Time in sunlight", value: pct(m.illuminationPct) },
    {
      label: "Weighted by visible disc",
      value: pct(m.illuminationPctWeighted),
      note: "Counts a half-hidden Sun as half.",
    },
    {
      label: "Longest dark period",
      value: `${cut ? "≥ " : ""}${formatDuration(m.longestDarkH)}`,
      note: cut
        ? "It touches the edge of the period, so it may last longer."
        : m.longestDarkInterval?.start && m.longestDarkInterval.end
          ? `${formatUtc(timestampDate(m.longestDarkInterval.start).getTime())} to ${formatUtc(timestampDate(m.longestDarkInterval.end).getTime())}`
          : undefined,
    },
    { label: "Dark periods", value: String(m.darkPeriodsCount) },
  ];
  if (m.sunElevMeanVisibleDeg !== undefined) {
    items.push({ label: "Mean Sun elevation when lit", value: formatDeg(m.sunElevMeanVisibleDeg) });
  }
  if (m.sunElevMaxDeg !== undefined) {
    items.push({ label: "Highest Sun elevation", value: formatDeg(m.sunElevMaxDeg) });
  }
  items.push({ label: "Eclipse time", value: formatDuration(m.eclipseHours) });
  if (m.energyKwhPerM2 !== undefined) {
    items.push({
      label: "Solar energy (vertical tracking panel)",
      value: `${m.energyKwhPerM2.toFixed(1)} kWh/m²`,
    });
  }
  return items;
}

function earth(m: Metrics): Item[] {
  const items: Item[] = [
    { label: "Time with Earth in view", value: pct(m.earthVisiblePct) },
    { label: "Hours with Earth in view", value: formatDuration(m.earthVisibleH) },
    { label: "Longest contact window", value: formatDuration(m.longestCommWindowH) },
    { label: "Longest blackout", value: formatDuration(m.longestCommBlackoutH) },
  ];
  if (m.earthElevMeanDeg !== undefined) {
    items.push({ label: "Mean Earth elevation", value: formatDeg(m.earthElevMeanDeg) });
  }
  if (m.earthElevMinDeg !== undefined && m.earthElevMaxDeg !== undefined) {
    items.push({
      label: "Earth elevation range",
      value: `${formatDeg(m.earthElevMinDeg)} to ${formatDeg(m.earthElevMaxDeg)}`,
    });
  }
  return items;
}

function operations(m: Metrics): Item[] {
  const items: Item[] = [
    {
      label: "Sunlight and Earth together",
      value: pct(m.operablePct),
      note: "Power and direct contact at the same time.",
    },
    { label: "Longest operable window", value: formatDuration(m.longestOperableWindowH) },
  ];
  if (m.firstSunriseAfterLanding && m.firstSunriseAfterLanding.seconds > BigInt(0)) {
    items.push({
      label: "First sunrise after landing",
      value: formatUtc(timestampDate(m.firstSunriseAfterLanding).getTime()),
    });
  }
  return items;
}

function Group({ title, tone, items }: { title: string; tone: string; items: Item[] }) {
  const id = `metrics-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section role="region" aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className={cn("text-sm font-semibold", tone)}>
        {title}
      </h3>
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((it) => (
          <div key={it.label} className="rounded-lg border border-surface bg-panel p-3">
            <dt className="text-xs text-muted">{it.label}</dt>
            <dd className="font-mono text-lg tabular-nums">{it.value}</dd>
            {it.note && <dd className="text-xs text-muted">{it.note}</dd>}
          </div>
        ))}
      </dl>
    </section>
  );
}

export function MetricsView({ result }: { result: AnalysisResult }) {
  const m = result.metrics;
  if (!m) return <p className="text-sm text-muted">The engine returned no metrics.</p>;
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <Group title="Sunlight" tone="text-sun" items={sunlight(m)} />
      <Group title="Earth contact" tone="text-earth" items={earth(m)} />
      <Group title="Operations" tone="text-text" items={operations(m)} />
    </div>
  );
}

export function MetricsPanel({ site, range }: { site: SiteProp; range: RangeProp }) {
  const analysis = useAnalysis(site, range);
  return (
    <section aria-labelledby="metrics-title" className="flex flex-col gap-4">
      <h2 id="metrics-title" className="text-lg font-semibold">
        Metrics for this period
      </h2>
      {analysisStatus(analysis, "metrics") ?? <MetricsView result={analysis.result!} />}
    </section>
  );
}
