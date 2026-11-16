"use client";

/**
 * VisibilityHeatmap — M3 Timeline energía/comunicación. Owner: Frontend Charts (docs/team/ROLES.md).
 * Especificación: sección 12.2. ECharts: días (filas) x horas UTC (columnas), un panel por Sol,
 * Tierra y Operable. Datos solo del motor (AnalysisService.Analyze); `currentTime` sale del store.
 */
import { useMemo, useState } from "react";

import {
  parseUtc,
  useAnalysis,
  type RangeProp,
  type SiteProp,
} from "@/components/horizon/use-analysis";
import { useScenarioStore } from "@/stores/scenario-store";

import { HeatChart } from "./heat-chart";
import { panelOption, type HeatColors } from "./heat-option";
import {
  buildHeatmap,
  dailyPercent,
  heatSummary,
  longestRun,
  runSegments,
  type HeatCell,
} from "./heatmap-math";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const ROW_PX = 6;

interface Props {
  site: SiteProp;
  range: RangeProp;
}

type PaletteName = "status" | "contrast";

const css = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function colors(palette: PaletteName): HeatColors {
  const base = {
    text: css("--color-text"),
    muted: css("--color-muted"),
    space: css("--color-space"),
  };
  return palette === "status"
    ? {
        ...base,
        hidden: css("--color-bad"),
        partial: css("--color-partial"),
        visible: css("--color-good"),
        mark: css("--color-earth"),
        now: css("--color-text"),
      }
    : {
        ...base,
        // Rampa de luminosidad: no depende de distinguir rojo y verde.
        hidden: css("--color-surface"),
        partial: css("--color-muted"),
        visible: css("--color-text"),
        mark: css("--color-earth"),
        now: css("--color-sun"),
      };
}

const stamp = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace("T", " ");

export function VisibilityHeatmap({ site, range }: Props) {
  const { result, queued, error, pending, invalidRange } = useAnalysis(site, range);
  const currentTime = useScenarioStore((s) => s.currentTime);
  const [palette, setPalette] = useState<PaletteName>("status");

  const data = useMemo(() => {
    const s = result?.series;
    if (!s || !s.sun || !s.earth || s.time.length === 0) return undefined;
    const times = s.time.map((t) => Number(t.seconds) * 1000);
    const sun = buildHeatmap(times, s.sun.fraction);
    const earth = buildHeatmap(times, s.earth.fraction);
    const operable = buildHeatmap(
      times,
      s.operable.map((v) => (v ? 1 : 0)),
    );
    const dark = longestRun(s.sunVisible, false);
    const blackout = longestRun(s.earthVisible, false);
    const stepH = times.length > 1 ? (times[1]! - times[0]!) / HOUR_MS : 1;
    return {
      times,
      days: sun.days,
      panels: { Sun: sun.cells, Earth: earth.cells, Operable: operable.cells },
      darkSegments: dark.len ? runSegments(times, dark.start, dark.start + dark.len - 1) : [],
      blackoutSegments: blackout.len
        ? runSegments(times, blackout.start, blackout.start + blackout.len - 1)
        : [],
      dark: {
        hours: dark.len * stepH,
        start: stamp(times[dark.start] ?? 0),
        end: stamp((times[dark.start + dark.len - 1] ?? 0) + HOUR_MS),
      },
      blackout: {
        hours: blackout.len * stepH,
        start: stamp(times[blackout.start] ?? 0),
        end: stamp((times[blackout.start + blackout.len - 1] ?? 0) + HOUR_MS),
      },
    };
  }, [result]);

  if (invalidRange) return <p className="text-sm text-bad">The date range is not valid.</p>;
  if (error) {
    return (
      <p role="alert" className="text-sm text-bad">
        Could not load the visibility timeline for this site.
      </p>
    );
  }
  if (queued)
    return <p className="text-sm text-muted">Computing the timeline… this can take a moment.</p>;
  if (pending || !result || !data) return <p className="text-sm text-muted">Loading timeline…</p>;

  const firstDay = Math.floor(data.times[0]! / DAY_MS);
  const nowMs = currentTime ? parseUtc(currentTime) : null;
  const nowDay = nowMs === null ? -1 : Math.floor(nowMs / DAY_MS) - firstDay;
  const nowCell: [number, number] | undefined =
    nowMs !== null && nowDay >= 0 && nowDay < data.days.length
      ? [Math.floor((nowMs % DAY_MS) / HOUR_MS), nowDay]
      : undefined;

  const palettes = colors(palette);
  const metrics = result.metrics;
  const height = Math.min(240, Math.max(80, data.days.length * ROW_PX + 34));
  const marks: Record<keyof typeof data.panels, typeof data.darkSegments> = {
    Sun: data.darkSegments,
    Earth: data.blackoutSegments,
    Operable: [],
  };
  const setFromCell = (day: number, hour: number) =>
    useScenarioStore
      .getState()
      .setCurrentTime(new Date((firstDay + day) * DAY_MS + hour * HOUR_MS).toISOString());

  const summary = metrics
    ? heatSummary({
        sunPct: metrics.illuminationPct,
        earthPct: metrics.earthVisiblePct,
        operablePct: metrics.operablePct,
        dark: data.dark,
        blackout: data.blackout,
      })
    : "";

  const swatch = (color: string, label: string) => (
    <li className="flex items-center gap-2">
      <span
        aria-hidden
        className="inline-block size-3 rounded-sm border border-surface"
        style={{ backgroundColor: color }}
      />
      {label}
    </li>
  );
  const dailyTable = (Object.keys(data.panels) as (keyof typeof data.panels)[]).map((name) => ({
    name,
    rows: dailyPercent(data.days, data.panels[name] as HeatCell[]),
  }));

  return (
    <section aria-label="Visibility timeline" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-4 text-sm text-muted" aria-label="Legend">
          {swatch(palettes.visible, "Visible")}
          {swatch(palettes.partial, "Partial")}
          {swatch(palettes.hidden, "Not visible")}
          <li>
            Outlined: longest dark spell (Sun) and blackout (Earth). Dashed or bright cell: current
            time.
          </li>
        </ul>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={palette === "contrast"}
            onChange={(e) => setPalette(e.target.checked ? "contrast" : "status")}
          />
          High contrast (color-blind safe)
        </label>
      </div>

      {(Object.keys(data.panels) as (keyof typeof data.panels)[]).map((name) => (
        <div key={name}>
          <h3 className="text-sm font-medium">
            {name === "Operable" ? "Operable (Sun and Earth)" : name}
          </h3>
          <HeatChart
            height={height}
            label={`${name} visibility by day and UTC hour`}
            onCellClick={setFromCell}
            option={panelOption({
              name,
              days: data.days,
              cells: data.panels[name] as HeatCell[],
              marks: marks[name],
              nowCell,
              colors: palettes,
            })}
          />
        </div>
      ))}
      <p className="text-xs text-muted">
        Columns: hour of the day, UTC. Rows: day. Click a cell to move the current time.
      </p>
      <p className="text-sm">{summary}</p>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted">Table view (percent of each day)</summary>
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-left font-mono">
            <caption className="sr-only">
              Percent of each UTC day with the Sun visible, the Earth visible and both
            </caption>
            <thead>
              <tr>
                <th scope="col">Day</th>
                {dailyTable.map((t) => (
                  <th key={t.name} scope="col">
                    {t.name} %
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.days.map((day, i) => (
                <tr key={day}>
                  <th scope="row" className="font-normal">
                    {day}
                  </th>
                  {dailyTable.map((t) => (
                    <td key={t.name}>
                      {t.rows[i]?.pct === null ? "-" : Math.round(t.rows[i]!.pct!)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
