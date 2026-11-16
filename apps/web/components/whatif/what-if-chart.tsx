"use client";

/**
 * WhatIfChart — M9 What-if de retraso (HU-08). Owner: Frontend Analysis (issue #39).
 * Especificación: secciones 9.9 y 12.2. Datos solo del motor (WhatIfService.Evaluate) o del mock
 * del SDK. Un panel por métrica: mezclar % y horas en un mismo eje confunde.
 */
import { useMutation } from "@connectrpc/connect-query";
import { engineErrorCode, isUnimplemented, WhatIfService } from "@lumen/sdk";
import { useId, useMemo, useState, type FormEvent, type ReactNode } from "react";

import type { RangeProp, SiteProp } from "@/components/horizon/use-analysis";

import { WhatIfLineChart } from "./whatif-chart";
import {
  DEFAULT_FORM,
  failingSpans,
  METRICS,
  toEvaluateRequest,
  validateForm,
  whatIfSummary,
  type MetricKey,
  type PointView,
  type WhatIfForm,
} from "./whatif-math";
import { whatIfOption } from "./whatif-option";

interface Props {
  site: SiteProp;
  range: RangeProp;
}

const toMs = (t: { seconds: bigint }) => Number(t.seconds) * 1000;
const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const css = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function errorMessage(err: unknown): string {
  const code = engineErrorCode(err);
  if (code === "NO_COVERAGE") return "There is no terrain data for this site.";
  if (code === "NOT_IMPLEMENTED" || isUnimplemented(err))
    return "The what-if needs this site's terrain horizon, which the engine cannot compute yet.";
  if (code === "RANGE_TOO_LONG") return "Delay plus mission is longer than the engine allows.";
  if (code === "UNKNOWN_METRIC" || code === "VALIDATION_ERROR")
    return "The engine rejected some values. Check the form.";
  return "The what-if failed. Try again later.";
}

const NUMBER_FIELDS = [
  { key: "maxDelayDays", label: "Maximum delay", unit: "days", step: "1" },
  { key: "stepHours", label: "Delay step", unit: "hours", step: "1" },
  { key: "missionDays", label: "Mission duration", unit: "days", step: "1" },
] as const;

export function WhatIfChart({ site, range }: Props) {
  const id = useId();
  const [form, setForm] = useState<WhatIfForm>({ ...DEFAULT_FORM, nominal: range.start });
  const [submitted, setSubmitted] = useState(false);
  const errors = validateForm(site, form);
  const evaluate = useMutation(WhatIfService.method.evaluate);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    evaluate.mutate(toEvaluateRequest(site, form));
  };

  const toggleMetric = (key: MetricKey) =>
    setForm((f) => ({
      ...f,
      metrics: f.metrics.includes(key) ? f.metrics.filter((m) => m !== key) : [...f.metrics, key],
    }));

  const res = evaluate.data;
  const view = useMemo(() => {
    if (!res || res.points.length === 0) return undefined;
    const points: PointView[] = res.points.map((pt) => ({
      delayHours: pt.delayHours,
      landingMs: pt.landing ? toMs(pt.landing) : 0,
      metrics: pt.metrics,
      survives: pt.survives,
    }));
    const shown = METRICS.filter((m) => m.key in (res.points[0]?.metrics ?? {}));
    return {
      points,
      shown,
      spans: failingSpans(points),
      summary: whatIfSummary(points, res.recommendedDelaysHours),
      withPower: points.some((pt) => pt.survives !== undefined),
    };
  }, [res]);

  const showErrors = submitted && Object.keys(errors).length > 0;
  const fieldError = (key: keyof WhatIfForm) => (submitted ? errors[key] : undefined);

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-4">
      <h2 id={`${id}-title`} className="text-lg font-medium">
        What if the landing slips?
      </h2>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            id={`${id}-nominal`}
            label="Nominal landing"
            unit="UTC"
            error={fieldError("nominal")}
          >
            <input
              id={`${id}-nominal`}
              type="text"
              inputMode="numeric"
              placeholder="YYYY-MM-DD"
              value={form.nominal}
              aria-invalid={fieldError("nominal") ? true : undefined}
              aria-describedby={fieldError("nominal") ? `${id}-nominal-error` : undefined}
              onChange={(e) => setForm((f) => ({ ...f, nominal: e.target.value }))}
              className={inputClass(fieldError("nominal"))}
            />
          </Field>
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
                inputMode="numeric"
                step={f.step}
                value={Number.isNaN(form[f.key]) ? "" : form[f.key]}
                aria-invalid={fieldError(f.key) ? true : undefined}
                aria-describedby={fieldError(f.key) ? `${id}-${f.key}-error` : undefined}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    [f.key]: e.target.value === "" ? Number.NaN : Number(e.target.value),
                  }))
                }
                className={inputClass(fieldError(f.key))}
              />
            </Field>
          ))}
        </div>

        <fieldset
          className="flex flex-col gap-2 text-sm"
          aria-describedby={fieldError("metrics") ? `${id}-metrics-error` : undefined}
        >
          <legend className="mb-1">Metrics to compare</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {METRICS.map((m) => (
              <label key={m.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.metrics.includes(m.key)}
                  onChange={() => toggleMetric(m.key)}
                />
                {m.label} <span className="text-muted">({m.unit})</span>
              </label>
            ))}
          </div>
          {fieldError("metrics") && (
            <span id={`${id}-metrics-error`} className="text-xs text-bad">
              {fieldError("metrics")}
            </span>
          )}
        </fieldset>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.withPower}
            onChange={(e) => setForm((f) => ({ ...f, withPower: e.target.checked }))}
          />
          Also check the battery for each delay (small-lander preset)
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={evaluate.isPending}
            className="w-fit rounded-md bg-sun px-4 py-2 font-medium text-space hover:opacity-90 disabled:opacity-50"
          >
            {evaluate.isPending ? "Evaluating…" : "Evaluate delays"}
          </button>
          {showErrors && (
            <span role="alert" className="text-sm text-bad">
              Fix the highlighted fields.
            </span>
          )}
        </div>
      </form>

      {evaluate.error && (
        <p role="alert" className="text-sm text-bad">
          {errorMessage(evaluate.error)}
        </p>
      )}

      {res && view && (
        <div className="flex flex-col gap-4">
          <p role="status" className="text-base font-medium">
            {view.summary}
          </p>
          <ul className="flex flex-wrap gap-4 text-sm text-muted" aria-label="Legend">
            <li>Dots: recommended delays.</li>
            {view.withPower && <li>Shaded: delays where the battery runs out.</li>}
          </ul>
          {view.shown.map((m) => (
            <WhatIfLineChart
              key={m.key}
              label={`${m.label} by landing delay`}
              option={whatIfOption(m, view.points, res.recommendedDelaysHours, view.spans, {
                line: css("--color-earth"),
                recommended: css("--color-good"),
                failing: css("--color-bad"),
                text: css("--color-text"),
                muted: css("--color-muted"),
              })}
            />
          ))}
          <details className="text-sm">
            <summary className="cursor-pointer text-muted">Table view (one row per delay)</summary>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-left font-mono">
                <caption className="sr-only">Metrics for each landing delay</caption>
                <thead>
                  <tr>
                    <th scope="col">Delay (days)</th>
                    <th scope="col">Landing</th>
                    {view.shown.map((m) => (
                      <th key={m.key} scope="col">
                        {m.label} ({m.unit})
                      </th>
                    ))}
                    {view.withPower && <th scope="col">Battery</th>}
                    <th scope="col">Recommended</th>
                  </tr>
                </thead>
                <tbody>
                  {view.points.map((pt) => (
                    <tr key={pt.delayHours}>
                      <th scope="row" className="font-normal">
                        {(pt.delayHours / 24).toFixed(pt.delayHours % 24 ? 1 : 0)}
                      </th>
                      <td>{day(pt.landingMs)}</td>
                      {view.shown.map((m) => (
                        <td key={m.key}>{(pt.metrics[m.key] ?? 0).toFixed(1)}</td>
                      ))}
                      {view.withPower && <td>{pt.survives ? "survives" : "runs out"}</td>}
                      <td>{res.recommendedDelaysHours.includes(pt.delayHours) ? "yes" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </section>
  );
}

const inputClass = (error?: string) =>
  `rounded-md border bg-space px-2 py-1 font-mono ${error ? "border-bad" : "border-surface"}`;

interface FieldProps {
  id: string;
  label: string;
  unit: string;
  error?: string;
  children: ReactNode;
}

function Field({ id, label, unit, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={id}>
        {label} <span className="text-muted">({unit})</span>
      </label>
      {children}
      {error && (
        <span id={`${id}-error`} className="text-xs text-bad">
          {error}
        </span>
      )}
    </div>
  );
}
