import { describe, expect, it } from "vitest";

import { echartsToSvg, svgElementToString } from "./charts";

describe("echartsToSvg", () => {
  it("renders a standalone vector SVG of the chart option", () => {
    const svg = echartsToSvg(
      {
        xAxis: { type: "value" },
        yAxis: { type: "value" },
        series: [
          {
            type: "line",
            data: [
              [0, 1],
              [1, 3],
              [2, 2],
            ],
          },
        ],
      },
      "#0b0e14",
    );
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('width="1200"');
    expect(svg).toMatch(/<path/);
  });
});

describe("svgElementToString", () => {
  it("adds the SVG namespace and a background", () => {
    document.body.innerHTML =
      '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="2" style="fill: rgb(245, 183, 0)"></circle></svg>';
    const out = svgElementToString(document.querySelector("svg")!, "#0b0e14");
    expect(out).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(out).toContain('fill="#0b0e14"');
    expect(out).toContain("rgb(245, 183, 0)");
  });
});
