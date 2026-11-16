import { describe, expect, it } from "vitest";

import { hourlyGrid } from "./hourly-grid";

const H = 3_600_000;
const D = 24 * H;
const t0 = Date.UTC(2027, 0, 1);

describe("hourlyGrid", () => {
  it("averages the samples of each UTC hour into a day × hour grid", () => {
    const times = [t0, t0 + 0.5 * H, t0 + H, t0 + D + 5 * H];
    const grid = hourlyGrid(times, [0, 1, 0.25, 1], t0, t0 + D + 6 * H, 30 * 60_000);
    expect(grid.days).toEqual([t0, t0 + D]);
    expect(grid.cells[0]![0]).toBe(0.5);
    expect(grid.cells[0]![1]).toBe(0.25);
    expect(grid.cells[1]![5]).toBe(1);
  });

  it("leaves hours outside the period empty", () => {
    const grid = hourlyGrid([t0 + 3 * H], [1], t0 + 3 * H, t0 + 4 * H, 60 * 60_000);
    expect(grid.cells[0]![2]).toBeNull();
    expect(grid.cells[0]![3]).toBe(1);
  });

  it("fills hours between coarse samples with the nearest earlier one", () => {
    const grid = hourlyGrid([t0, t0 + 2 * H], [0.2, 0.8], t0, t0 + 3 * H, 2 * H);
    expect(grid.cells[0]![1]).toBe(0.2);
  });
});
