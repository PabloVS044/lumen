import { describe, expect, it } from "vitest";

import {
  DEFAULT_FORM,
  OBJECTIVES,
  gridCells,
  searchSummary,
  toFindRequest,
  validateForm,
} from "./search-math";

const form = { ...DEFAULT_FORM, lat: -89.45, lon: -137.31, start: "2027-01-01", end: "2027-02-01" };

describe("OBJECTIVES", () => {
  it("offers the engine's metrics plus the weighted score", () => {
    expect(OBJECTIVES[0]).toEqual({ key: "illumination_pct", label: "Sunlight", unit: "%" });
    expect(OBJECTIVES.at(-1)!.key).toBe("score");
    expect(OBJECTIVES).toHaveLength(11);
  });
});

describe("toFindRequest", () => {
  it("builds the contract request with UTC dates", () => {
    const req = toFindRequest(form);
    expect(req.center).toMatchObject({ lat: -89.45, lon: -137.31 });
    expect(req.radiusKm).toBe(5);
    expect(req.spacingM).toBe(250);
    expect(req.maxSlopeDeg).toBe(15);
    expect(req.topK).toBe(5);
    expect(req.objective).toBe("illumination_pct");
    expect(Number(req.range!.start!.seconds)).toBe(Date.UTC(2027, 0, 1) / 1000);
  });
});

describe("validateForm", () => {
  it("accepts the defaults with a site and range", () => {
    expect(validateForm(form)).toEqual({});
  });

  it("flags contract limits and missing inputs", () => {
    expect(validateForm({ ...form, radiusKm: 30 })).toHaveProperty("radiusKm");
    expect(validateForm({ ...form, spacingM: 10 })).toHaveProperty("spacingM");
    expect(validateForm({ ...form, maxSlopeDeg: 60 })).toHaveProperty("maxSlopeDeg");
    expect(validateForm({ ...form, lat: Number.NaN })).toHaveProperty("lat");
    expect(validateForm({ ...form, end: "2026-12-01" })).toHaveProperty("end");
  });
});

describe("gridCells", () => {
  it("places row-major values as km offsets from the center and skips NaN", () => {
    // 3 x 3, paso 500 m: fila 0 = y mínima
    const values = [Number.NaN, 1, 2, 3, 4, 5, 6, 7, Number.NaN];
    expect(gridCells(values, 3, 3, 500)).toEqual([
      [0, -0.5, 1],
      [0.5, -0.5, 2],
      [-0.5, 0, 3],
      [0, 0, 4],
      [0.5, 0, 5],
      [-0.5, 0.5, 6],
      [0, 0.5, 7],
    ]);
  });
});

describe("searchSummary", () => {
  it("names the best spot and how far it is from the center", () => {
    const text = searchSummary(
      { lat: -89.45, lon: -137.31 },
      [{ lat: -89.4403, lon: -137.134, value: 85.3 }],
      { label: "Sunlight", unit: "%" },
    );
    expect(text).toBe(
      "Best spot: -89.4403, -137.1340 with Sunlight 85.3 %, 0.30 km from the center.",
    );
  });

  it("handles no candidates", () => {
    expect(searchSummary({ lat: 0, lon: 0 }, [], { label: "Sunlight", unit: "%" })).toBe(
      "No spot within the radius meets the slope limit.",
    );
  });
});
