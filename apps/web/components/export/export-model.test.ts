import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { AnalyzeRequestSchema } from "@lumen/sdk";
import { mockAnalysis } from "@lumen/sdk/mocks";
import { describe, expect, it } from "vitest";

import { exportName, metricsCsv, resultJson, seriesCsv, svgMarkup } from "./export-model";

const start = Date.UTC(2027, 0, 1);
const result = mockAnalysis(
  create(AnalyzeRequestSchema, {
    site: { lat: -89.45, lon: -137.31, obsHeightM: 2 },
    range: {
      start: timestampFromDate(new Date(start)),
      end: timestampFromDate(new Date(start + 2 * 3_600_000)),
      stepMinutes: 60,
    },
  }),
);

describe("seriesCsv (HU-12 AC1)", () => {
  it("writes one UTC row per sample with every series column", () => {
    const lines = seriesCsv(result).trim().split("\n");
    expect(lines[0]).toBe(
      "time_utc,sun_az_deg,sun_el_deg,sun_fraction,earth_az_deg,earth_el_deg,earth_fraction,horizon_at_sun_deg,horizon_at_earth_deg,eclipse_fraction,sun_visible,earth_visible,operable",
    );
    expect(lines).toHaveLength(4);
    expect(lines[1]!.startsWith("2027-01-01T00:00:00.000Z,")).toBe(true);
    expect(lines[1]!.split(",")).toHaveLength(13);
    expect(lines[1]).toMatch(/,(true|false),(true|false),(true|false)$/);
  });
});

describe("metricsCsv", () => {
  it("lists each metric by its proto name", () => {
    const csv = metricsCsv(result);
    expect(csv.split("\n")[0]).toBe("metric,value");
    expect(csv).toContain(`illumination_pct,${result.metrics!.illuminationPct}`);
    expect(csv).toContain("longest_dark_h,");
  });
});

describe("resultJson", () => {
  it("uses the proto JSON mapping", () => {
    const json = JSON.parse(resultJson(result));
    expect(json.metrics.illuminationPct).toBe(result.metrics!.illuminationPct);
    expect(json.series.time[0]).toBe("2027-01-01T00:00:00Z");
  });
});

describe("exportName", () => {
  it("names files after the site and the period", () => {
    expect(
      exportName({ lat: -89.45, lon: -137.31 }, start, start + 30 * 86_400_000, "series", "csv"),
    ).toBe("lumen_-89.450_-137.310_2027-01-01_2027-01-31_series.csv");
  });
});

describe("svgMarkup (HU-12 AC2)", () => {
  it("makes a standalone SVG with a size and a background", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 100 50");
    svg.innerHTML = '<circle r="5" class="fill-sun"></circle>';
    const out = svgMarkup(svg, "#0b0e14");
    expect(out).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(out).toContain('width="100"');
    expect(out).toContain('height="50"');
    expect(out).toMatch(/<rect[^>]*fill="#0b0e14"/);
    expect(out).toContain("<circle");
  });
});
