"use client";

/**
 * PowerSimulator — M8 Simulador de batería (HU-07). Owner: Frontend Analysis (issue #38).
 * Especificación: secciones 9.8 y 12.2. Datos solo del motor (PowerService.Simulate) o del mock
 * del SDK; el preset sale del documento técnico.
 */
import { useMutation } from "@connectrpc/connect-query";
import { engineErrorCode, isUnimplemented, PanelOrientation, PowerService } from "@lumen/sdk";
import { useId, useMemo, useState, type FormEvent } from "react";

import { parseUtc, type RangeProp, type SiteProp } from "@/components/horizon/use-analysis";

import { PowerChart } from "./power-chart";
import {
  dailyEnergy,
  ORIENTATIONS,
  polarPanelHint,
  powerSummary,
  PRESETS,
  toPowerConfig,
  validateForm,
  type PowerForm,
} from "./power-math";
import { powerOption } from "./power-option";

interface Props {
  site: SiteProp;
  range: RangeProp;
}

const STEP_MINUTES = 60;
const secs = (ms: number) => ({ seconds: BigInt(Math.floor(ms / 1000)) });
const toMs = (t: { seconds: bigint; nanos?: number }) => Number(t.seconds) * 1000;
const stamp = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace("T", " ");
const css = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

type NumericField = Exclude<keyof PowerForm, "orientation">;

const FIELDS: { key: NumericField; label: string; unit: string; step: string }[] = [
  { key: "panelAreaM2", label: "Panel area", unit: "m²", step: "0.1" },
  { key: "efficiency", label: "Panel efficiency", unit: "0–1", step: "0.01" },
  { key: "batteryWh", label: "Battery capacity", unit: "Wh", step: "50" },
  { key: "soc0Pct", label: "Initial charge", unit: "%", step: "1" },
  { key: "maxDodPct", label: "Max depth of discharge", unit: "%", step: "1" },
  { key: "loadDayW", label: "Load in sunlight", unit: "W", step: "1" },
  { key: "loadNightW", label: "Load in darkness", unit: "W", step: "1" },
  { key: "batteryEfficiency", label: "Battery efficiency", unit: "0–1", step: "0.01" },
];

function errorMessage(err: unknown): string {
  const code = engineErrorCode(err);
  if (code === "NO_COVERAGE")
    return "There is no terrain data for this site, so it cannot be simulated.";
  if (code === "NOT_IMPLEMENTED" || isUnimplemented(err))
    return "The simulation needs this site's terrain horizon, which the engine cannot compute yet.";
  if (code === "VALIDATION_ERROR") return "The engine rejected some values. Check the form.";
  return "The simulation failed. Try again later.";
}

export function PowerSimulator({ site, range }: Props) {
  const id = useId();
  const [form, setForm] = useState<PowerForm>(PRESETS.small.values);
  const [submitted, setSubmitted] = useState(false);
  const errors = validateForm(form);
  const sim = useMutation(PowerService.method.simulate);

  const start = parseUtc(range.start);
  const end = parseUtc(range.end);
  const invalidRange = start === null || end === null || end <= start;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (invalidRange || Object.keys(errors).length) return;
    sim.mutate({
      scenario: {
        site: { lat: site.lat, lon: site.lon, obsHeightM: site.obsHeightM ?? 0 },
        range: { start: secs(start), end: secs(end), stepMinutes: STEP_MINUTES },
      },
      config: toPowerConfig(form),
    });
  };

  const setNumber = (key: NumericField, raw: string) =>
    setForm((f) => ({ ...f, [key]: raw === "" ? Number.NaN : Number(raw) }));

  const result = sim.data;
  const view = useMemo(() => {
    if (!result || result.time.length === 0) return undefined;
    const timesMs = result.time.map(toMs);
    const brownoutMs = result.firstBrownoutTime ? toMs(result.firstBrownoutTime) : null;
    return {
      timesMs,
      brownoutMs,
      daily: dailyEnergy(timesMs, result.socPct, result.pGenW, result.pLoadW),
      summary: powerSummary({
        survives: result.survives,
        minSocPct: result.minSocPct,
        energyMarginWh: result.energyMarginWh,
        brownoutAt: brownoutMs === null ? null : stamp(brownoutMs),
      }),
    };
  }, [result]);

  const showErrors = submitted && Object.keys(errors).length > 0;

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-4">
      <h2 id={`${id}-title`} className="text-lg font-medium">
        Power and battery
      </h2>

      <form
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-4"
        aria-describedby={`${id}-note`}
      >
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Preset
            <select
              className="rounded-md border border-surface bg-space px-2 py-1"
              value="small"
              onChange={() => setForm(PRESETS.small.values)}
            >
              <option value="small">{PRESETS.small.label}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Panel orientation
            <select
              className="rounded-md border border-surface bg-space px-2 py-1"
              value={form.orientation}
              onChange={(e) =>
                setForm((f) => ({ ...f, orientation: Number(e.target.value) as PanelOrientation }))
              }
            >
              {ORIENTATIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {form.orientation === PanelOrientation.VERTICAL_FIXED && (
            <NumberField
              id={`${id}-panelAzimuthDeg`}
              label="Panel azimuth"
              unit="° from north"
              step="1"
              value={form.panelAzimuthDeg}
              error={submitted ? errors.panelAzimuthDeg : undefined}
              onChange={(v) => setNumber("panelAzimuthDeg", v)}
            />
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FIELDS.map((f) => (
            <NumberField
              key={f.key}
              id={`${id}-${f.key}`}
              label={f.label}
              unit={f.unit}
              step={f.step}
              value={form[f.key]}
              error={submitted ? errors[f.key] : undefined}
              onChange={(v) => setNumber(f.key, v)}
            />
          ))}
        </div>

        {polarPanelHint(site.lat, form.orientation) && (
          <p className="text-sm text-partial">
            Vertical panels are meant for polar sites, where the Sun stays near the horizon. Near
            the equator the Sun passes high overhead and a horizontal panel generates more.
          </p>
        )}
        <p id={`${id}-note`} className="text-xs text-muted">
          Does not model temperature, dust, the lander&apos;s own shadow or non-solar power. See the
          methodology page.
        </p>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={sim.isPending || invalidRange}
            className="w-fit rounded-md bg-sun px-4 py-2 font-medium text-space hover:opacity-90 disabled:opacity-50"
          >
            {sim.isPending ? "Simulating…" : "Run simulation"}
          </button>
          {invalidRange && <span className="text-sm text-bad">The date range is not valid.</span>}
          {showErrors && (
            <span role="alert" className="text-sm text-bad">
              Fix the highlighted fields.
            </span>
          )}
        </div>
      </form>

      {sim.error && (
        <p role="alert" className="text-sm text-bad">
          {errorMessage(sim.error)}
        </p>
      )}

      {result && view && (
        <div className="flex flex-col gap-3">
          <p
            role="status"
            className={`text-base font-medium ${result.survives ? "text-good" : "text-bad"}`}
          >
            {result.survives
              ? "Survives the whole range"
              : `Runs out of power on ${stamp(view.brownoutMs!)} UTC`}
          </p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted">Lowest charge</dt>
              <dd className="font-mono">{result.minSocPct.toFixed(1)}%</dd>
            </div>
            <div>
              <dt className="text-muted">
                {result.energyMarginWh >= 0 ? "Margin above reserve" : "Load not served"}
              </dt>
              <dd className="font-mono">{Math.abs(result.energyMarginWh).toFixed(0)} Wh</dd>
            </div>
          </dl>
          <PowerChart
            label="Battery charge and power over time"
            option={powerOption(
              {
                timesMs: view.timesMs,
                socPct: result.socPct,
                genW: result.pGenW,
                loadW: result.pLoadW,
                brownoutMs: view.brownoutMs,
                reservePct: 100 - form.maxDodPct,
              },
              {
                soc: css("--color-earth"),
                generated: css("--color-sun"),
                consumed: css("--color-muted"),
                brownout: css("--color-bad"),
                text: css("--color-text"),
                muted: css("--color-muted"),
              },
            )}
          />
          <p className="text-sm">{view.summary}</p>
          <details className="text-sm">
            <summary className="cursor-pointer text-muted">Table view (per UTC day)</summary>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-left font-mono">
                <caption className="sr-only">
                  Lowest battery charge, energy generated and energy consumed per UTC day
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Day</th>
                    <th scope="col">Lowest charge %</th>
                    <th scope="col">Generated kWh</th>
                    <th scope="col">Load kWh</th>
                  </tr>
                </thead>
                <tbody>
                  {view.daily.map((d) => (
                    <tr key={d.day}>
                      <th scope="row" className="font-normal">
                        {d.day}
                      </th>
                      <td>{Math.round(d.minSocPct)}</td>
                      <td>{d.generatedKwh.toFixed(2)}</td>
                      <td>{d.consumedKwh.toFixed(2)}</td>
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

interface NumberFieldProps {
  id: string;
  label: string;
  unit: string;
  step: string;
  value: number;
  error?: string;
  onChange: (raw: string) => void;
}

function NumberField({ id, label, unit, step, value, error, onChange }: NumberFieldProps) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={id}>
        {label} <span className="text-muted">({unit})</span>
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        value={Number.isNaN(value) ? "" : value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-md border bg-space px-2 py-1 font-mono ${error ? "border-bad" : "border-surface"}`}
      />
      {error && (
        <span id={`${id}-error`} className="text-xs text-bad">
          {error}
        </span>
      )}
    </div>
  );
}
