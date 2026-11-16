import { describe, expect, it } from "vitest";

import { bestIndices, COMPARE_ROWS } from "./compare-model";

describe("COMPARE_ROWS (HU-04 AC1)", () => {
  it("covers the metrics the story asks for", () => {
    expect(COMPARE_ROWS.map((r) => r.key)).toEqual([
      "illumination_pct",
      "longest_dark_h",
      "earth_visible_h",
      "longest_comm_window_h",
      "sun_elev_mean_visible_deg",
      "sun_elev_max_deg",
      "operable_pct",
    ]);
  });
});

describe("bestIndices (HU-04 AC2)", () => {
  it("prefers higher or lower values depending on the metric", () => {
    expect(bestIndices([10, 30, 20], "high")).toEqual([1]);
    expect(bestIndices([10, 30, 20], "low")).toEqual([0]);
  });

  it("keeps ties and skips missing values", () => {
    expect(bestIndices([30, 10, 30], "high")).toEqual([0, 2]);
    expect(bestIndices([30, undefined, 10], "high")).toEqual([0]);
    expect(bestIndices([undefined, undefined], "high")).toEqual([]);
  });

  it("does not crown a winner when every value is the same", () => {
    expect(bestIndices([5, 5], "high")).toEqual([]);
  });
});
