import { describe, expect, it } from "vitest";

import {
  type CheckFields,
  checkCells,
  describeCheck,
  formatMagnitude,
  formatMargin,
  margin,
  summarize,
} from "./format";

// Entradas de prueba, no datos de la UI: la página solo muestra lo que devuelve el motor.
const check = (init: Partial<CheckFields>): CheckFields => ({
  id: "",
  description: "",
  tolerance: 0,
  maxError: 0,
  passed: false,
  ...init,
});

const NBSP = "\u00a0";

describe("formatMagnitude", () => {
  it("writes ordinary values with their unit", () => {
    expect(formatMagnitude(0.01, "deg")).toBe("0.01°");
    expect(formatMagnitude(3, "min")).toBe(`3${NBSP}min`);
    expect(formatMagnitude(0)).toBe("0");
  });

  it("switches to powers of ten below 0.001 with two significant digits", () => {
    expect(formatMagnitude(9.256e-9, "deg")).toBe(`9.3${NBSP}×${NBSP}10⁻⁹°`);
    expect(formatMagnitude(5.428e-7)).toBe(`5.4${NBSP}×${NBSP}10⁻⁷`);
  });
});

describe("margin", () => {
  it("is the limit divided by the worst error", () => {
    expect(margin(3, 1)).toBe(3);
    expect(margin(0.01, 5.428e-7)).toBeCloseTo(18_423, 0);
  });

  it("is undefined when the error is exactly zero", () => {
    expect(margin(0.01, 0)).toBeUndefined();
  });

  it("rounds to two significant digits and groups thousands", () => {
    expect(formatMargin(18_423)).toBe(`18${NBSP}000×`);
    expect(formatMargin(1_080_380)).toBe(`1${NBSP}100${NBSP}000×`);
    expect(formatMargin(3)).toBe("3×");
    expect(formatMargin(0.5)).toBe("0.5×");
  });
});

describe("describeCheck", () => {
  it("names known checks and knows their unit", () => {
    expect(describeCheck(check({ id: "ephemeris_sun_vs_horizons" }))).toMatchObject({
      label: "Sun azimuth and elevation",
      reference: "JPL Horizons",
      unit: "deg",
    });
    expect(describeCheck(check({ id: "eclipse_vs_spice_occult" })).unit).toBe("min");
  });

  it("falls back to the engine's description, then to the id", () => {
    expect(describeCheck(check({ id: "horizon_flat_dem", description: "Flat DEM" }))).toEqual({
      label: "Flat DEM",
    });
    expect(describeCheck(check({ id: "horizon_flat_dem" })).label).toBe("horizon_flat_dem");
  });

  it("knows the PGDA illumination check is a minimum, in percent", () => {
    expect(describeCheck(check({ id: "illumination_site01_rois_vs_pgda" }))).toMatchObject({
      label: "Sunlight at Connecting ridge",
      unit: "pct",
      kind: "minimum",
    });
  });
});

describe("checkCells", () => {
  it("shows limit, worst error and margin for error checks", () => {
    const earth = check({ id: "ephemeris_earth_vs_horizons", tolerance: 0.01, maxError: 5.428e-7 });
    expect(checkCells(earth)).toEqual({
      limit: "0.01°",
      worst: `5.4${NBSP}×${NBSP}10⁻⁷°`,
      margin: `18${NBSP}000×`,
    });
    expect(checkCells(check({ id: "eclipse_vs_spice_occult", tolerance: 3 })).margin).toBe("exact");
  });

  it("shows a minimum as a threshold and the error as the shortfall below it", () => {
    // max_error de esta prueba = déficit bajo el 70 % (notes del informe).
    const pgda = check({ id: "illumination_site01_rois_vs_pgda", tolerance: 70, maxError: 0 });
    expect(checkCells(pgda)).toEqual({
      limit: `>${NBSP}70${NBSP}%`,
      worst: `0${NBSP}%${NBSP}short`,
      margin: "n/a",
    });
  });
});

describe("summarize", () => {
  const sun = check({
    id: "ephemeris_sun_vs_horizons",
    tolerance: 0.01,
    maxError: 9.256e-9,
    passed: true,
  });
  const earth = check({
    id: "ephemeris_earth_vs_horizons",
    tolerance: 0.01,
    maxError: 5.428e-7,
    passed: true,
  });
  const eclipse = check({ id: "eclipse_vs_spice_occult", tolerance: 3, maxError: 1, passed: true });

  it("counts passing checks and quotes the largest angle error", () => {
    expect(summarize([sun, earth, eclipse])).toBe(
      `All 3 checks pass. The largest angle error is 5.4${NBSP}×${NBSP}10⁻⁷°, ` +
        `18${NBSP}000 times smaller than the 0.01° limit.`,
    );
  });

  it("says how many fail and when an angle is over its limit", () => {
    const off = check({ ...earth, maxError: 0.02, passed: false });
    expect(summarize([sun, off, eclipse])).toBe(
      "2 of 3 checks pass. The largest angle error is 0.02°, over the 0.01° limit.",
    );
  });

  it("handles an empty report", () => {
    expect(summarize([])).toBe("The report has no checks yet.");
  });
});
