"use client";

/**
 * Vista de /site (sección 12.1): cabecera del sitio, periodo, cobertura de terreno (HU-01 AC4), cifras
 * clave, contadores (HU-06), métricas (M7) y los gráficos de SiteCharts. Owner: Frontend Charts.
 * Todo el estado compartible vive en la URL (`lib/url-state.ts`); requiere `<Suspense>` por encima.
 */
import { useQuery } from "@connectrpc/connect-query";
import { engineErrorCode, isUnimplemented, Region, SiteService, TerrainService } from "@lumen/sdk";
import { useQueryStates } from "nuqs";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { Countdowns } from "@/components/metrics/countdowns";
import { KeyFigures } from "@/components/metrics/key-figures";
import { MetricsPanel } from "@/components/metrics/metrics-panel";
import { SitePicker } from "@/components/site-picker/site-picker";
import { DAY_MS } from "@/components/time-controls/time-math";
import { formatLatLon, normalizeLon } from "@/lib/coords";
import { cn } from "@/lib/utils";
import { siteSearchParams } from "@/lib/url-state";

import { ExportSection } from "./export-section";
import { SiteCharts } from "./site-charts";

// Tolerancia para reconocer un sitio del catálogo a partir de la URL (redondeo de decimales).
const SAME_POINT_DEG = 1e-6;
const DEFAULT_DAYS = 30;
const card = "rounded-lg border border-surface bg-panel p-4";
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function SiteView() {
  const [q, setQ] = useQueryStates(siteSearchParams);
  const pick = (s: { lat: number; lon: number }) => void setQ({ lat: s.lat, lon: s.lon });

  // Sin periodo en la URL: hoy (UTC) y 30 días, escrito en la URL para que todo use el mismo rango.
  useEffect(() => {
    if (q.start && q.end) return;
    const today = Math.floor(Date.now() / DAY_MS) * DAY_MS;
    void setQ(
      { start: q.start ?? isoDay(today), end: q.end ?? isoDay(today + DEFAULT_DAYS * DAY_MS) },
      { history: "replace" },
    );
  }, [q.start, q.end, setQ]);

  if (q.lat === null || q.lon === null) {
    return (
      <section aria-labelledby="choose-site" className={cn(card, "flex max-w-2xl flex-col gap-4")}>
        <h2 id="choose-site" className="text-lg font-semibold">
          Choose a site
        </h2>
        <p className="text-sm text-muted">
          Pick a site from the catalog or enter any point on the Moon to see when it has sunlight
          and a direct line to Earth.
        </p>
        <SitePicker mapLink onSelect={pick} />
      </section>
    );
  }

  if (q.lat < -90 || q.lat > 90) {
    return (
      <section className={cn(card, "flex max-w-2xl flex-col gap-4")}>
        <p role="alert" className="text-bad">
          This link has a latitude of {q.lat}°, outside -90° to 90°. Choose another site.
        </p>
        <SitePicker mapLink onSelect={pick} />
      </section>
    );
  }

  // Misma entrada que SiteCharts (lon tal como viene en la URL) para compartir la consulta al motor.
  const site = { lat: q.lat, lon: q.lon, obsHeightM: q.h };
  const range = q.start && q.end && q.end > q.start ? { start: q.start, end: q.end } : null;

  return (
    <div className="flex flex-col gap-8">
      <SiteHeader lat={site.lat} lon={normalizeLon(q.lon)} obsHeightM={q.h} onPick={pick} />
      {range && (
        <>
          <section aria-label="Summary" className="flex flex-col gap-3">
            <KeyFigures site={site} range={range} />
            <Countdowns site={site} range={range} compact />
          </section>
          <MetricsPanel site={site} range={range} />
        </>
      )}
      <SiteCharts />
      {range && <ExportSection site={site} range={range} />}
    </div>
  );
}

function SiteHeader({
  lat,
  lon,
  obsHeightM,
  onPick,
}: {
  lat: number;
  lon: number;
  obsHeightM: number;
  onPick: (s: { lat: number; lon: number }) => void;
}) {
  const [q, setQ] = useQueryStates(siteSearchParams);
  const catalog = useQuery(SiteService.method.listSites, { region: Region.UNSPECIFIED });
  const site = catalog.data?.sites.find(
    (s) => Math.abs(s.lat - lat) < SAME_POINT_DEG && Math.abs(s.lon - lon) < SAME_POINT_DEG,
  );
  const badRange = q.start && q.end && q.end <= q.start;
  const changeSite = useRef<HTMLDetailsElement>(null);
  const closeChangeSite = () => {
    const el = changeSite.current;
    if (!el) return;
    el.open = false;
    el.querySelector("summary")?.focus();
  };

  return (
    <header className={cn(card, "flex flex-col gap-5")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">{site?.name ?? "Custom point"}</h2>
          <p className="font-mono text-sm text-text">{formatLatLon(lat, lon)}</p>
          <p className="text-sm text-muted">Observer {obsHeightM} m above the ground</p>
          {site && !site.verified && (
            <p className="text-sm text-partial">Catalog coordinates not verified yet</p>
          )}
        </div>
        <details
          ref={changeSite}
          className="relative"
          onKeyDown={(e) => {
            if (e.key === "Escape" && changeSite.current?.open) closeChangeSite();
          }}
        >
          <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-surface px-4 text-sm hover:bg-surface">
            Change site
          </summary>
          <div className="absolute right-0 z-30 mt-2 w-[min(28rem,calc(100vw-3rem))] rounded-lg border border-surface bg-panel p-4 shadow-xl">
            <SitePicker
              mapLink
              onSelect={(s) => {
                onPick(s);
                closeChangeSite();
              }}
            />
          </div>
        </details>
      </div>

      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-xs text-muted">Period (UTC)</legend>
          <div className="flex flex-wrap gap-3">
            <DateField label="Start" value={q.start} onChange={(start) => setQ({ start })} />
            <DateField label="End" value={q.end} onChange={(end) => setQ({ end })} />
          </div>
          {badRange && (
            <p className="text-sm text-bad">The end date must be after the start date.</p>
          )}
        </fieldset>
        <TerrainCoverage lat={lat} lon={lon} />
      </div>
    </header>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-muted">
        {label}
      </label>
      <input
        id={id}
        type="date"
        className="min-h-11 rounded-md border border-surface bg-space px-3 font-mono text-sm text-text"
        value={value?.slice(0, 10) ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </div>
  );
}

/** Capas y resolución del DEM que cubre el punto, antes de calcular nada (HU-01 AC4). */
function TerrainCoverage({ lat, lon }: { lat: number; lon: number }) {
  const { data, error, isPending } = useQuery(TerrainService.method.getCoverage, {
    point: { lat, lon },
  });
  const coverage = data?.coverage;

  let body: ReactNode;
  if (isPending) body = <p className="text-muted">Checking terrain data…</p>;
  else if (error) {
    body = (
      <p className={isUnimplemented(error) ? "text-muted" : "text-bad"}>
        {engineErrorCode(error) === "NO_COVERAGE"
          ? "No terrain model covers this point, so its horizon cannot be computed."
          : isUnimplemented(error)
            ? "Terrain coverage is not available from the engine yet."
            : `Could not check terrain data: ${error.message}`}
      </p>
    );
  } else if (coverage) {
    body = (
      <>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted">Layers</dt>
          <dd className="font-mono">{coverage.layers.join(", ") || "None"}</dd>
          {coverage.nearResM !== undefined && (
            <>
              <dt className="text-muted">Finest resolution</dt>
              <dd className="font-mono">{coverage.nearResM} m</dd>
            </>
          )}
          {coverage.interpolatedFraction !== undefined && (
            <>
              <dt className="text-muted">Interpolated</dt>
              <dd className="font-mono">{(coverage.interpolatedFraction * 100).toFixed(1)}%</dd>
            </>
          )}
        </dl>
        {coverage.warnings.length > 0 && (
          <ul className="flex flex-col gap-1 text-partial">
            {coverage.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
      </>
    );
  }

  return (
    <section aria-label="Terrain data" className="flex flex-col gap-2 text-sm">
      <h3 className="text-xs text-muted">Terrain data</h3>
      {body}
    </section>
  );
}
