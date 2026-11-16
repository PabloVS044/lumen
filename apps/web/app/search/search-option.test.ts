import { describe, expect, it } from "vitest";

import { searchOption } from "./search-option";

const colors = { low: "a", high: "b", top: "c", center: "d", text: "e", muted: "f" };

describe("searchOption", () => {
  it("colors cells by value and marks best spots and the center", () => {
    const opt = searchOption(
      [
        [0, 0, 10],
        [0.5, 0, 30],
      ],
      [[0.5, 0]],
      { label: "Sunlight", unit: "%" },
      colors,
    );
    expect(opt.visualMap).toMatchObject({ min: 10, max: 30, dimension: 2 });
    expect(opt.series.map((s) => s.name)).toEqual(["Sunlight", "Best spots", "Center"]);
    expect(opt.series[1]!.data).toEqual([[0.5, 0]]);
  });

  it("keeps a valid color range when every cell has the same value", () => {
    const opt = searchOption([[0, 0, 5]], [], { label: "S", unit: "%" }, colors);
    expect(opt.visualMap.max).toBeGreaterThan(opt.visualMap.min);
  });
});
