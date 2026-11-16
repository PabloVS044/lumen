import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const files = vi.hoisted(() => ({
  downloadText: vi.fn(),
  downloadDataUrl: vi.fn(),
}));
vi.mock("@/lib/export/files", async (orig) => ({
  ...(await orig<typeof import("@/lib/export/files")>()),
  ...files,
}));

import { ChartDownload, SvgDownload } from "./chart-download";

afterEach(() => vi.clearAllMocks());

const option = {
  xAxis: { type: "value" },
  yAxis: { type: "value" },
  series: [
    {
      type: "line",
      data: [
        [0, 1],
        [1, 2],
      ],
    },
  ],
};

describe("ChartDownload", () => {
  it("downloads the chart option as a vector SVG", () => {
    render(<ChartDownload option={option} name="Battery charge" />);
    fireEvent.click(screen.getByRole("button", { name: /download battery charge as svg/i }));
    const [file, text, mime] = files.downloadText.mock.calls[0]!;
    expect(file).toBe("lumen-Battery-charge.svg");
    expect(text).toMatch(/^<svg/);
    expect(mime).toBe("image/svg+xml");
  });

  it("reports a PNG failure instead of failing silently", async () => {
    // jsdom no tiene canvas: la exportación PNG falla y se avisa
    render(<ChartDownload option={option} name="Battery charge" />);
    fireEvent.click(screen.getByRole("button", { name: /as png/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not export/i);
  });
});

describe("SvgDownload", () => {
  it("exports the page SVG with a background", () => {
    const ref = createRef<SVGSVGElement>();
    render(
      <>
        <svg ref={ref} viewBox="0 0 10 10">
          <circle r="2" />
        </svg>
        <SvgDownload svgRef={ref} name="Horizon" size={500} />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: /download horizon as svg/i }));
    const [file, text] = files.downloadText.mock.calls[0]!;
    expect(file).toBe("lumen-Horizon.svg");
    expect(text).toContain('xmlns="http://www.w3.org/2000/svg"');
  });
});
