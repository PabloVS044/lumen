import { describe, expect, it } from "vitest";

import {
  DEFAULT_FORM,
  METRICS,
  failingSpans,
  toEvaluateRequest,
  validateForm,
  whatIfSummary,
  type PointView,
} from "./whatif-math";

const site = { lat: -89.45, lon: -137.31, obsHeightM: 2 };
const form = { ...DEFAULT_FORM, nominal: "2027-01-01" };

describe("METRICS", () => {
  it("lists exactly the metrics the engine accepts, with direction", () => {
    expect(METRICS.map((m) => [m.key, m.higherIsBetter])).toEqual([
      ["illumination_pct", true],
      ["illumination_pct_weighted", true],
      ["longest_dark_h", false],
      ["earth_visible_pct", true],
      ["earth_visible_h", true],
      ["longest_comm_window_h", true],
      ["longest_comm_blackout_h", false],
      ["operable_pct", true],
      ["longest_operable_window_h", true],
      ["energy_kwh_per_m2", true],
    ]);
  });
});

describe("toEvaluateRequest", () => {
  it("builds the request and adds the small-lander battery only when asked", () => {
    const req = toEvaluateRequest(site, form);
    expect(req.maxDelayDays).toBe(30);
    expect(req.delayStepHours).toBe(24);
    expect(req.missionDurationDays).toBe(14);
    expect(req.metrics).toEqual(["illumination_pct", "longest_dark_h", "operable_pct"]);
    expect(Number(req.nominalLanding!.seconds)).toBe(Date.UTC(2027, 0, 1) / 1000);
    expect(req.power).toBeUndefined();
    expect(toEvaluateRequest(site, { ...form, withPower: true }).power?.batteryWh).toBe(2000);
  });
});

describe("validateForm", () => {
  it("accepts the defaults", () => {
    expect(validateForm(site, form)).toEqual({});
  });

  it("flags contract violations, no metrics and ranges the engine rejects", () => {
    expect(validateForm(site, { ...form, missionDays: 0 })).toHaveProperty("missionDays");
    expect(validateForm(site, { ...form, metrics: [] })).toHaveProperty("metrics");
    expect(validateForm(site, { ...form, nominal: "not a date" })).toHaveProperty("nominal");
    // 365 días de retraso + 366 de misión superan el límite de 730 días del motor
    expect(validateForm(site, { ...form, maxDelayDays: 365, missionDays: 366 })).toHaveProperty(
      "maxDelayDays",
    );
  });
});

const p = (d: number, survives?: boolean, illum = 50): PointView => ({
  delayHours: d * 24,
  landingMs: Date.UTC(2027, 0, 1 + d),
  metrics: { illumination_pct: illum },
  survives,
});

describe("failingSpans", () => {
  it("groups consecutive delays where the battery fails", () => {
    const pts = [p(0, false), p(1, false), p(2, true), p(3, false), p(4, true)];
    expect(failingSpans(pts)).toEqual([
      [0, 1],
      [3, 3],
    ]);
  });
});

describe("whatIfSummary", () => {
  it("names the recommended delays and the failing ones", () => {
    const pts = [p(0, false, 40), p(1, true, 70), p(2, true, 90)];
    expect(whatIfSummary(pts, [48])).toBe(
      "Recommended: land with a 2-day delay (2027-01-03). 1 of 3 delays brown out the battery.",
    );
  });

  it("handles a run with no recommendation", () => {
    expect(whatIfSummary([p(0, false)], [])).toBe(
      "No delay is recommended in this range. 1 of 1 delays brown out the battery.",
    );
  });
});
