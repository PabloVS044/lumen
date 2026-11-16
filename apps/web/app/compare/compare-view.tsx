"use client";

/**
 * Vista de /compare (M5 sitios, M6 fechas; HU-04, HU-10). Owner: Frontend Analysis (R6, hoy R5).
 * Los escenarios (sitio + fechas) viven en la URL, así que el enlace reproduce la misma comparación.
 * Requiere `<Suspense>` por encima (nuqs con Cache Components).
 */
import { useQuery } from "@connectrpc/connect-query";
import {
  AnalysisService,
  isUnimplemented,
  Region,
  SiteService,
  type CatalogSite,
} from "@lumen/sdk";
import { skipToken } from "@tanstack/react-query";
import { X } from "lucide-react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { useId, useState, useSyncExternalStore } from "react";

import { CompareTable, type CompareColumn } from "@/components/compare/compare-table";
import { SITE_COLORS } from "@/components/site-picker/site-picker-model";
import { SitePicker } from "@/components/site-picker/site-picker";
import { formatLatLon, normalizeLon } from "@/lib/coords";
import { cn } from "@/lib/utils";
import { useScenarioStore } from "@/stores/scenario-store";

import {
  compareSearchParams,
  defaultDates,
  MAX_SCENARIOS,
  RANK_METRICS,
  shiftScenario,
  type RankMetric,
  type ScenarioParam,
} from "./compare-url";

const LETTERS = ["A", "B", "C", "D"];
const DELAYS = [7, 14, 30, 60];
const STEP_MINUTES = 60;
const SAME_POINT_DEG = 1e-6;

const RANK_LABEL: Record<RankMetric, string> = {
  operable_pct: "Most time with sunlight and Earth together",
  illumination_pct: "Most time in sunlight",
  earth_visible_pct: "Most time with Earth in view",
};
const RANK_GET: Record<RankMetric, (r: CompareColumn["result"]) => number | undefined> = {
  operable_pct: (r) => r.metrics?.operablePct,
  illumination_pct: (r) => r.metrics?.illuminationPct,
  earth_visible_pct: (r) => r.metrics?.earthVisiblePct,
};

const noopSubscribe = () => () => {};
const nowMs = () => Math.floor(Date.now() / 86_400_000) * 86_400_000;
const secs = (date: string) => ({ seconds: BigInt(Date.parse(`${date}T00:00:00Z`) / 1000) });
const control = "min-h-11 rounded-md border border-surface bg-space px-3 text-sm text-text";
const button =
  "min-h-11 rounded-md border border-surface px-3 text-sm hover:bg-surface disabled:opacity-50";

function nameOf(catalog: CatalogSite[] | undefined, s: { lat: number; lon: number }) {
  const lon = normalizeLon(s.lon);
  return (
    catalog?.find(
      (c) => Math.abs(c.lat - s.lat) < SAME_POINT_DEG && Math.abs(c.lon - lon) < SAME_POINT_DEG,
    )?.name ?? "Custom point"
  );
}

export function CompareView() {
  const [{ s: scenarios, metric }, setQ] = useQueryStates(compareSearchParams);
  const now = useSyncExternalStore(noopSubscribe, nowMs, () => null);
  const explored = useScenarioStore((st) => st.sites);
  const catalog = useQuery(SiteService.method.listSites, { region: Region.UNSPECIFIED }).data
    ?.sites;

  const setScenarios = (next: ScenarioParam[]) => void setQ({ s: next.slice(0, MAX_SCENARIOS) });
  const full = scenarios.length >= MAX_SCENARIOS;
  const datesForNew = () =>
    scenarios.at(-1) ?? (now === null ? null : { ...defaultDates(now), lat: 0, lon: 0 });

  const add = (site: { lat: number; lon: number }) => {
    const d = datesForNew();
    if (!d || full) return;
    setScenarios([...scenarios, { lat: site.lat, lon: site.lon, start: d.start, end: d.end }]);
  };

  const ready = scenarios.length >= 2;
  const query = useQuery(
    AnalysisService.method.compare,
    ready
      ? {
          scenarios: scenarios.map((sc) => ({
            site: { lat: sc.lat, lon: normalizeLon(sc.lon), obsHeightM: 2 },
            range: { start: secs(sc.start), end: secs(sc.end), stepMinutes: STEP_MINUTES },
          })),
        }
      : skipToken,
  );

  const labelOf = (i: number) => `${LETTERS[i]}. ${nameOf(catalog, scenarios[i]!)}`;
  const columns: CompareColumn[] =
    query.data && query.data.results.length === scenarios.length
      ? query.data.results.map((result, i) => ({
          id: `${i}`,
          label: labelOf(i),
          detail: `${scenarios[i]!.start} → ${scenarios[i]!.end}`,
          color: SITE_COLORS[i]!,
          result,
        }))
      : [];

  const leader = (() => {
    if (columns.length < 2) return null;
    let best = -1;
    let bestV = -Infinity;
    columns.forEach((c, i) => {
      const v = RANK_GET[metric](c.result);
      if (v !== undefined && v > bestV) {
        bestV = v;
        best = i;
      }
    });
    return best < 0 ? null : { label: columns[best]!.label, value: bestV };
  })();

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="scenarios-title" className="flex flex-col gap-4">
        <h2 id="scenarios-title" className="text-lg font-semibold">
          Scenarios ({scenarios.length} of {MAX_SCENARIOS})
        </h2>
        <p className="max-w-3xl text-sm text-muted">
          A scenario is a site and a period. Compare different sites, or the same site on different
          dates, for example if the landing slips by two weeks.
        </p>

        {scenarios.length > 0 && (
          <ol className="grid gap-3 lg:grid-cols-2">
            {scenarios.map((sc, i) => (
              <ScenarioItem
                key={`${i}-${sc.lat}-${sc.lon}`}
                letter={LETTERS[i]!}
                name={nameOf(catalog, sc)}
                color={SITE_COLORS[i]!}
                scenario={sc}
                canDuplicate={!full}
                onChange={(next) => setScenarios(scenarios.map((x, k) => (k === i ? next : x)))}
                onRemove={() => setScenarios(scenarios.filter((_, k) => k !== i))}
                onDelay={(days) => setScenarios([...scenarios, shiftScenario(sc, days)])}
              />
            ))}
          </ol>
        )}

        {scenarios.length === 0 && explored.length >= 2 && (
          <button
            type="button"
            className={cn(button, "self-start")}
            disabled={now === null}
            onClick={() => {
              if (now === null) return;
              const d = defaultDates(now);
              setScenarios(explored.map((x) => ({ lat: x.lat, lon: x.lon, ...d })));
            }}
          >
            Use the {Math.min(explored.length, MAX_SCENARIOS)} sites from Explore
          </button>
        )}

        {full ? (
          <p className="text-sm text-muted">
            The comparison holds up to {MAX_SCENARIOS} scenarios. Remove one to add another.
          </p>
        ) : (
          <details
            className="max-w-xl rounded-lg border border-surface bg-panel p-4"
            open={scenarios.length < 2}
          >
            <summary className="cursor-pointer text-sm font-medium">Add a site</summary>
            <div className="mt-4">
              <SitePicker mapLink onSelect={add} />
            </div>
          </details>
        )}
      </section>

      <section aria-labelledby="results-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="results-title" className="text-lg font-semibold">
            Results
          </h2>
          <RankSelect value={metric} onChange={(m) => void setQ({ metric: m })} />
        </div>

        {!ready ? (
          <p className="text-sm text-muted">Add at least 2 scenarios to compare them.</p>
        ) : query.error ? (
          <p role="alert" className={isUnimplemented(query.error) ? "text-muted" : "text-bad"}>
            {isUnimplemented(query.error)
              ? "The engine cannot compare scenarios yet."
              : `Could not compare: ${query.error.message}`}
          </p>
        ) : columns.length === 0 ? (
          <p role="status" className="text-sm text-muted">
            Computing {scenarios.length} scenarios…
          </p>
        ) : (
          <>
            {leader && (
              <p className="text-sm">
                {RANK_LABEL[metric]}: <strong>{leader.label}</strong> ({leader.value.toFixed(1)}%).
              </p>
            )}
            <CompareTable columns={columns} />
            {columns.some((c) => c.result.meta?.engineVersion === "mock") && (
              <p className="text-sm text-partial">Synthetic data (SDK mock), not real results.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function RankSelect({ value, onChange }: { value: RankMetric; onChange: (m: RankMetric) => void }) {
  const id = useId();
  return (
    <div className="flex w-full flex-col gap-1 sm:w-auto">
      <label htmlFor={id} className="text-xs text-muted">
        Highlight
      </label>
      <select
        id={id}
        className={cn(control, "w-full sm:w-auto")}
        value={value}
        onChange={(e) => onChange(e.target.value as RankMetric)}
      >
        {RANK_METRICS.map((m) => (
          <option key={m} value={m}>
            {RANK_LABEL[m]}
          </option>
        ))}
      </select>
    </div>
  );
}

function ScenarioItem({
  letter,
  name,
  color,
  scenario,
  canDuplicate,
  onChange,
  onRemove,
  onDelay,
}: {
  letter: string;
  name: string;
  color: string;
  scenario: ScenarioParam;
  canDuplicate: boolean;
  onChange: (s: ScenarioParam) => void;
  onRemove: () => void;
  onDelay: (days: number) => void;
}) {
  const id = useId();
  const [delay, setDelay] = useState(14);
  const date = (key: "start" | "end", label: string) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${id}-${key}`} className="text-xs text-muted">
        {label}
      </label>
      <input
        id={`${id}-${key}`}
        type="date"
        className={cn(control, "font-mono")}
        value={scenario[key]}
        onChange={(e) => {
          const next = { ...scenario, [key]: e.target.value };
          if (next.start && next.end && next.end > next.start) onChange(next);
        }}
      />
    </div>
  );
  const site = `/site?lat=${scenario.lat}&lon=${scenario.lon}&start=${scenario.start}&end=${scenario.end}`;

  return (
    <li
      aria-label={`${letter}. ${name}`}
      className="flex flex-col gap-3 rounded-lg border border-surface bg-panel p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-semibold">
            {letter}. {name}
          </span>
        </div>
        <button
          type="button"
          aria-label={`Remove ${letter}`}
          className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-text"
          onClick={onRemove}
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
      <p className="font-mono text-xs text-muted">{formatLatLon(scenario.lat, scenario.lon)}</p>
      <div className="flex flex-wrap gap-3">
        {date("start", "Start")}
        {date("end", "End")}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-delay`} className="text-xs text-muted">
            Delay
          </label>
          <select
            id={`${id}-delay`}
            className={control}
            value={delay}
            onChange={(e) => setDelay(Number(e.target.value))}
          >
            {DELAYS.map((d) => (
              <option key={d} value={d}>
                {d} days later
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className={button}
          disabled={!canDuplicate}
          onClick={() => onDelay(delay)}
        >
          Add delayed copy
        </button>
        <Link
          href={site}
          className="inline-flex min-h-11 items-center px-2 text-sm text-earth underline underline-offset-4"
        >
          Open site detail
        </Link>
      </div>
    </li>
  );
}
