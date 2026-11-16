"use client";

/**
 * BestSpotSearch — M12 Buscador de mejor punto (HU-09). Owner: Frontend Analysis (issue #41).
 * Especificación: sección 9.10. Datos solo del motor (SearchService) o del mock del SDK. El centro y
 * el rango se toman de la URL (?lat&lon&start&end), así se puede abrir desde /site o /explore.
 */
import { engineErrorCode, isUnimplemented, searchGridOffsetKm } from "@lumen/sdk";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { Suspense, useId, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { compareHref } from "@/app/explore/explore-links";
import { siteSearchParams } from "@/lib/url-state";

import { SearchChart } from "./search-chart";
import {
  DEFAULT_FORM,
  gridCells,
  OBJECTIVES,
  searchSummary,
  surfaceDistanceKm,
  toFindRequest,
  validateForm,
  type SearchForm,
} from "./search-math";
import { searchOption } from "./search-option";
import { useBestSpot } from "./use-best-spot";

const css = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function errorMessage(err: unknown): string {
  const code = engineErrorCode(err);
  if (code === "NO_COVERAGE")
    return "No terrain data covers this area, or no point meets the slope limit.";
  if (code === "SEARCH_QUEUE_FULL")
    return "The engine is busy with other searches. Try again soon.";
  if (code === "UNKNOWN_METRIC") return "The engine does not support that objective.";
  if (isUnimplemented(err)) return "The engine cannot run best-spot searches yet.";
  return "The search failed. Try again later.";
}

const NUMBER_FIELDS = [
  { key: "lat", label: "Center latitude", unit: "°", step: "0.0001" },
  { key: "lon", label: "Center longitude", unit: "° east", step: "0.0001" },
  { key: "radiusKm", label: "Search radius", unit: "km", step: "0.5" },
  { key: "spacingM", label: "Grid spacing", unit: "m", step: "50" },
  { key: "maxSlopeDeg", label: "Maximum slope", unit: "°", step: "1" },
  { key: "topK", label: "Spots to list", unit: "1–50", step: "1" },
] as const;

function Search() {
  const id = useId();
  const [{ lat, lon, start, end }] = useQueryStates(siteSearchParams);
  const [form, setForm] = useState<SearchForm>(() => ({
    ...DEFAULT_FORM,
    lat: lat ?? Number.NaN,
    lon: lon ?? Number.NaN,
    start: start ?? "",
    end: end ?? "",
  }));
  const [submitted, setSubmitted] = useState<SearchForm | null>(null);
  const errors = validateForm(form);
  const search = useBestSpot();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(form);
    if (Object.keys(errors).length) return;
    search.start(toFindRequest(form));
  };

  const res = search.result;
  const ran = submitted && Object.keys(validateForm(submitted)).length === 0 ? submitted : null;
  const view = useMemo(() => {
    if (!res || !ran) return undefined;
    const center = { lat: ran.lat, lon: ran.lon };
    const objective = OBJECTIVES.find((o) => o.key === ran.objective) ?? OBJECTIVES[0]!;
    const top = res.top.map((c, i) => {
      const point = { lat: c.point?.lat ?? 0, lon: c.point?.lon ?? 0 };
      return {
        rank: i + 1,
        ...point,
        value: ran.objective === "score" ? c.score : (c.metrics[ran.objective] ?? 0),
        distanceKm: surfaceDistanceKm(center, point),
        offset: searchGridOffsetKm(center, point),
      };
    });
    return {
      center,
      objective,
      top,
      cells: gridCells(res.gridValues, res.gridCols, res.gridRows, ran.spacingM),
      summary: searchSummary(center, top, objective),
      range: { start: ran.start, end: ran.end },
    };
  }, [res, ran]);

  const fieldError = (key: keyof SearchForm) => (submitted ? errors[key] : undefined);
  const setNumber = (key: (typeof NUMBER_FIELDS)[number]["key"], raw: string) =>
    setForm((f) => ({ ...f, [key]: raw === "" ? Number.NaN : Number(raw) }));

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-3xl text-sm text-muted">
        Search the terrain around a site for the point with the best conditions. Each grid point
        gets its own horizon from LOLA terrain; slopes steeper than the limit are skipped.
      </p>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {NUMBER_FIELDS.map((f) => (
            <Field
              key={f.key}
              id={`${id}-${f.key}`}
              label={f.label}
              unit={f.unit}
              error={fieldError(f.key)}
            >
              <input
                id={`${id}-${f.key}`}
                type="number"
                inputMode="decimal"
                step={f.step}
                value={Number.isNaN(form[f.key]) ? "" : form[f.key]}
                aria-invalid={fieldError(f.key) ? true : undefined}
                aria-describedby={fieldError(f.key) ? `${id}-${f.key}-error` : undefined}
                onChange={(e) => setNumber(f.key, e.target.value)}
                className={inputClass(fieldError(f.key))}
              />
            </Field>
          ))}
          {(["start", "end"] as const).map((key) => (
            <Field
              key={key}
              id={`${id}-${key}`}
              label={key === "start" ? "From" : "To"}
              unit="UTC"
              error={fieldError(key)}
            >
              <input
                id={`${id}-${key}`}
                type="text"
                inputMode="numeric"
                placeholder="YYYY-MM-DD"
                value={form[key]}
                aria-invalid={fieldError(key) ? true : undefined}
                aria-describedby={fieldError(key) ? `${id}-${key}-error` : undefined}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className={inputClass(fieldError(key))}
              />
            </Field>
          ))}
          <label className="flex flex-col gap-1 text-sm">
            Objective
            <select
              className="rounded-md border border-surface bg-space px-2 py-1"
              value={form.objective}
              onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))}
            >
              {OBJECTIVES.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label} ({o.unit})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={search.running}
            className="w-fit rounded-md bg-sun px-4 py-2 font-medium text-space hover:opacity-90 disabled:opacity-50"
          >
            {search.running ? "Searching…" : "Find best spot"}
          </button>
          {submitted && Object.keys(errors).length > 0 && (
            <span role="alert" className="text-sm text-bad">
              Fix the highlighted fields.
            </span>
          )}
          {search.running && (
            <span role="status" aria-live="polite" className="text-sm text-muted">
              Computing horizons for every grid point. Large areas can take a few minutes.
            </span>
          )}
        </div>
      </form>

      {search.error && (
        <p role="alert" className="text-sm text-bad">
          {errorMessage(search.error)}
        </p>
      )}

      {view && (
        <section aria-label="Search results" className="flex flex-col gap-4">
          <p role="status" className="text-base font-medium">
            {view.summary}
          </p>
          <SearchChart
            label={`${view.objective.label} around the center, with the best spots marked`}
            option={searchOption(
              view.cells,
              view.top.map((t) => t.offset),
              view.objective,
              {
                low: css("--color-surface"),
                high: css("--color-sun"),
                top: css("--color-earth"),
                center: css("--color-text"),
                text: css("--color-text"),
                muted: css("--color-muted"),
              },
            )}
          />
          <p className="text-xs text-muted">
            Axes are offsets in the terrain map projection (polar stereographic near the pole), not
            geographic north and east. Cells between evaluated points take the nearest value; the
            map is exploratory, not a guaranteed optimum.
          </p>
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Best spots, ranked by the objective</caption>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Latitude</th>
                  <th scope="col">Longitude</th>
                  <th scope="col">
                    {view.objective.label} ({view.objective.unit})
                  </th>
                  <th scope="col">From center</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {view.top.map((t) => (
                  <tr key={t.rank}>
                    <th scope="row" className="font-normal">
                      {t.rank}
                    </th>
                    <td>{t.lat.toFixed(4)}</td>
                    <td>{t.lon.toFixed(4)}</td>
                    <td>{t.value.toFixed(2)}</td>
                    <td>{t.distanceKm.toFixed(2)} km</td>
                    <td className="flex gap-3 font-sans">
                      <Link
                        className="underline"
                        href={`/site?lat=${t.lat}&lon=${t.lon}&start=${view.range.start}&end=${view.range.end}`}
                      >
                        Open
                      </Link>
                      <Link className="underline" href={compareHref([view.center, t], view.range)}>
                        Add to compare
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export function BestSpotSearch() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading search…</p>}>
      <Search />
    </Suspense>
  );
}

const inputClass = (error?: string) =>
  `rounded-md border bg-space px-2 py-1 font-mono ${error ? "border-bad" : "border-surface"}`;

function Field(props: {
  id: string;
  label: string;
  unit: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={props.id}>
        {props.label} <span className="text-muted">({props.unit})</span>
      </label>
      {props.children}
      {props.error && (
        <span id={`${props.id}-error`} className="text-xs text-bad">
          {props.error}
        </span>
      )}
    </div>
  );
}
