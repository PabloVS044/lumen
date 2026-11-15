import { describe, expect, it } from "vitest";

import {
  buildHeatmap,
  classify,
  dailyPercent,
  heatSummary,
  longestRun,
  runSegments,
} from "./heatmap-math";

const H = 3_600_000;
const D0 = Date.parse("2027-01-15T00:00:00Z");
const at = (h: number) => D0 + h * H;

describe("buildHeatmap", () => {
  it("lays hourly samples out as days x UTC hours", () => {
    const times = [at(22), at(23), at(24), at(25)];
    const { days, cells } = buildHeatmap(times, [1, 0.5, 0, 1]);
    expect(days).toEqual(["2027-01-15", "2027-01-16"]);
    expect(cells).toEqual([
      [22, 0, 1],
      [23, 0, 0.5],
      [0, 1, 0],
      [1, 1, 1],
    ]);
  });

  it("averages several samples that fall in the same hour", () => {
    const { cells } = buildHeatmap([at(3), at(3) + 30 * 60_000], [1, 0]);
    expect(cells).toEqual([[3, 0, 0.5]]);
  });

  it("keeps the day index continuous across a gap", () => {
    const { days, cells } = buildHeatmap([at(0), at(48)], [1, 1]);
    expect(days).toEqual(["2027-01-15", "2027-01-16", "2027-01-17"]);
    expect(cells.map((c) => c[1])).toEqual([0, 2]);
  });

  it("is empty for no samples", () => {
    expect(buildHeatmap([], [])).toEqual({ days: [], cells: [] });
  });
});

describe("classify", () => {
  it("maps a visible fraction to not visible / partial / visible", () => {
    expect(classify(0)).toBe(0);
    expect(classify(0.004)).toBe(0);
    expect(classify(0.5)).toBe(1);
    expect(classify(0.996)).toBe(2);
    expect(classify(1)).toBe(2);
  });
});

describe("longestRun", () => {
  it("finds the longest run of a value and the first one on ties", () => {
    expect(longestRun([true, false, false, true, false, false, false], false)).toEqual({
      start: 4,
      len: 3,
    });
    expect(longestRun([false, false, true, false, false], false)).toEqual({ start: 0, len: 2 });
  });

  it("returns length 0 when the value never occurs", () => {
    expect(longestRun([true, true], false)).toEqual({ start: 0, len: 0 });
  });
});

describe("runSegments", () => {
  it("splits a run that crosses midnight into one segment per day", () => {
    const times = Array.from({ length: 30 }, (_, i) => at(i));
    // muestras 20..27 = 20:00 de ayer a 03:00 de hoy
    expect(runSegments(times, 20, 27)).toEqual([
      { day: 0, h0: 20, h1: 24 },
      { day: 1, h0: 0, h1: 4 },
    ]);
  });

  it("returns a single segment for a run inside one day", () => {
    const times = Array.from({ length: 24 }, (_, i) => at(i));
    expect(runSegments(times, 5, 9)).toEqual([{ day: 0, h0: 5, h1: 10 }]);
  });
});

describe("dailyPercent", () => {
  it("averages each day of a panel as a percentage and leaves empty days null", () => {
    const rows = dailyPercent(
      ["2027-01-15", "2027-01-16", "2027-01-17"],
      [
        [0, 0, 1],
        [1, 0, 0],
        [0, 1, 0.5],
      ],
    );
    expect(rows).toEqual([
      { day: "2027-01-15", pct: 50 },
      { day: "2027-01-16", pct: 50 },
      { day: "2027-01-17", pct: null },
    ]);
  });
});

describe("heatSummary", () => {
  it("states the percentages and the longest dark spell and blackout", () => {
    const text = heatSummary({
      sunPct: 81.25,
      earthPct: 40,
      operablePct: 30,
      dark: { hours: 96, start: "2027-01-10 00:00", end: "2027-01-14 00:00" },
      blackout: { hours: 300, start: "2027-02-01 00:00", end: "2027-02-13 12:00" },
    });
    expect(text).toContain("Sun is visible 81.3% of the time");
    expect(text).toContain(
      "longest dark spell lasts 96.0 h, from 2027-01-10 00:00 to 2027-01-14 00:00 UTC",
    );
    expect(text).toContain("longest communications blackout lasts 300.0 h");
    expect(text).toContain("both available 30.0%");
  });

  it("omits runs that do not exist", () => {
    const text = heatSummary({
      sunPct: 100,
      earthPct: 100,
      operablePct: 100,
      dark: { hours: 0, start: "", end: "" },
    });
    expect(text).not.toContain("longest");
  });
});
