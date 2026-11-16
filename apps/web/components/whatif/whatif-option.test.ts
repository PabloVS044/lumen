import { describe, expect, it } from "vitest";

import { whatIfOption } from "./whatif-option";

const colors = { line: "a", recommended: "b", failing: "c", text: "d", muted: "e" };
const pts = [0, 1, 2].map((d) => ({
  delayHours: d * 24,
  landingMs: 0,
  metrics: { illumination_pct: 10 * d },
}));

describe("whatIfOption", () => {
  it("plots the metric against delay in days and marks recommended delays", () => {
    const opt = whatIfOption(
      { key: "illumination_pct", label: "Sunlight", unit: "%" },
      pts,
      [48],
      [],
      colors,
    );
    expect(opt.series[0]!.data).toEqual([
      [0, 0],
      [1, 10],
      [2, 20],
    ]);
    expect(opt.series[1]!.data).toEqual([[2, 20]]);
    expect(opt.series[0]!.markArea).toBeUndefined();
  });

  it("shades delays where the battery fails", () => {
    const opt = whatIfOption(
      { key: "illumination_pct", label: "S", unit: "%" },
      pts,
      [],
      [[0, 1]],
      colors,
    );
    expect(opt.series[0]!.markArea!.data).toEqual([
      [{ xAxis: -0.5, name: "Battery fails" }, { xAxis: 1.5 }],
    ]);
  });
});
