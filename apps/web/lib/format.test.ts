import { describe, expect, it } from "vitest";

import { formatDay, formatDeg, formatDuration, formatUtc } from "./format";

describe("formatUtc", () => {
  it("writes minutes in UTC", () => {
    expect(formatUtc(Date.UTC(2027, 0, 15, 6, 0, 30))).toBe("2027-01-15 06:00 UTC");
  });
});

describe("formatDeg", () => {
  it("keeps one decimal and a real minus sign", () => {
    expect(formatDeg(1.234)).toBe("1.2°");
    expect(formatDeg(-0.04)).toBe("−0.0°");
    expect(formatDeg(-2.38, 2)).toBe("−2.38°");
  });
});

describe("formatDuration", () => {
  it("uses days and hours", () => {
    expect(formatDuration(102.4)).toBe("4 d 6 h");
    expect(formatDuration(48)).toBe("2 d");
    expect(formatDuration(18)).toBe("18 h");
    expect(formatDuration(0.58)).toBe("35 min");
  });
});

describe("formatDay", () => {
  it("writes the UTC day", () => {
    expect(formatDay(Date.UTC(2027, 0, 5, 23))).toBe("Jan 05");
  });
});
