import { PanelOrientation } from "@lumen/sdk";
import { describe, expect, it } from "vitest";

import {
  PRESETS,
  dailyEnergy,
  polarPanelHint,
  powerSummary,
  toPowerConfig,
  validateForm,
  type PowerForm,
} from "./power-math";

const small = PRESETS.small.values;

describe("presets", () => {
  it("small lander matches section 9.8 of the technical doc", () => {
    expect(small).toEqual({
      panelAreaM2: 2,
      efficiency: 0.28,
      orientation: PanelOrientation.VERTICAL_TRACKING,
      panelAzimuthDeg: 0,
      batteryWh: 2000,
      soc0Pct: 100,
      maxDodPct: 80,
      loadDayW: 150,
      loadNightW: 60,
      batteryEfficiency: 0.95,
    });
  });
});

describe("toPowerConfig / validateForm", () => {
  it("sends every field explicitly and the azimuth only for a fixed panel", () => {
    const cfg = toPowerConfig({ ...small, loadNightW: 0 });
    expect(cfg.loadNightW).toBe(0);
    expect(cfg.panelAzimuthDeg).toBeUndefined();
    const fixed = toPowerConfig({
      ...small,
      orientation: PanelOrientation.VERTICAL_FIXED,
      panelAzimuthDeg: 120,
    });
    expect(fixed.panelAzimuthDeg).toBe(120);
  });

  it("returns no errors for the preset", () => {
    expect(validateForm(small)).toEqual({});
  });

  it("maps contract violations to form fields", () => {
    const errors = validateForm({ ...small, efficiency: 1.5, maxDodPct: 0 } satisfies PowerForm);
    expect(Object.keys(errors).sort()).toEqual(["efficiency", "maxDodPct"]);
  });
});

describe("dailyEnergy", () => {
  it("aggregates per UTC day: min SoC and energy in kWh", () => {
    const h = 3_600_000;
    const t0 = Date.UTC(2027, 0, 1);
    const times = [0, 1, 24, 25].map((k) => t0 + k * h);
    const rows = dailyEnergy(times, [100, 90, 80, 85], [1000, 0, 500, 500], [100, 100, 200, 200]);
    expect(rows).toEqual([
      { day: "2027-01-01", minSocPct: 90, generatedKwh: 1, consumedKwh: 0.2 },
      { day: "2027-01-02", minSocPct: 80, generatedKwh: 1, consumedKwh: 0.4 },
    ]);
  });
});

describe("powerSummary", () => {
  it("states survival and the minimum charge", () => {
    expect(
      powerSummary({ survives: true, minSocPct: 63.4, energyMarginWh: 867, brownoutAt: null }),
    ).toBe(
      "The lander survives the whole range. Battery charge never drops below 63%, 867 Wh above the reserve.",
    );
  });

  it("states when the battery runs out and the unserved energy", () => {
    expect(
      powerSummary({
        survives: false,
        minSocPct: 20,
        energyMarginWh: -1234.5,
        brownoutAt: "2027-01-07 14:00",
      }),
    ).toBe(
      "Power runs out on 2027-01-07 14:00 UTC. Over the range, 1235 Wh of load could not be served.",
    );
  });
});

describe("polarPanelHint", () => {
  it("warns only for a vertical panel away from the poles", () => {
    expect(polarPanelHint(0.7, PanelOrientation.VERTICAL_TRACKING)).toBe(true);
    expect(polarPanelHint(-89.4, PanelOrientation.VERTICAL_TRACKING)).toBe(false);
    expect(polarPanelHint(0.7, PanelOrientation.HORIZONTAL)).toBe(false);
  });
});
