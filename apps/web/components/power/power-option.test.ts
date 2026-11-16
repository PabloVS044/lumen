import { describe, expect, it } from "vitest";

import { powerOption } from "./power-option";

const colors = {
  soc: "a",
  generated: "b",
  consumed: "c",
  brownout: "d",
  text: "e",
  muted: "f",
};
const base = {
  timesMs: [0, 3_600_000],
  socPct: [100, 90],
  genW: [500, 0],
  loadW: [150, 60],
  reservePct: 20,
};

describe("powerOption", () => {
  it("plots charge on the % axis and power on the W axis", () => {
    const opt = powerOption({ ...base, brownoutMs: null }, colors);
    expect(opt.series.map((s) => [s.name, s.yAxisIndex])).toEqual([
      ["Battery charge", 0],
      ["Generated", 1],
      ["Load", 1],
    ]);
    expect(opt.series[0]!.data).toEqual([
      [0, 100],
      [3_600_000, 90],
    ]);
    expect(opt.series[0]!.markLine!.data).toEqual([{ yAxis: 20 }]);
    expect(opt.series[2]!.markLine).toBeUndefined();
  });

  it("marks the brownout instant", () => {
    const opt = powerOption({ ...base, brownoutMs: 3_600_000 }, colors);
    expect(opt.series[2]!.markLine!.data).toEqual([{ xAxis: 3_600_000 }]);
  });
});
