import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { TransportProvider } from "@connectrpc/connect-query";
import { AnalyzeRequestSchema } from "@lumen/sdk";
import { createMockTransport, mockAnalysis } from "@lumen/sdk/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ExportPanel } from "./export-panel";

const start = Date.UTC(2027, 0, 1);
const end = start + 2 * 86_400_000;
const request = create(AnalyzeRequestSchema, {
  site: { lat: -89.45, lon: -137.31, obsHeightM: 2 },
  range: {
    start: timestampFromDate(new Date(start)),
    end: timestampFromDate(new Date(end)),
    stepMinutes: 60,
  },
});
const result = mockAnalysis(request);

let downloads: string[] = [];

beforeEach(() => {
  downloads = [];
  URL.createObjectURL = vi.fn(() => "blob:mock");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push(this.download);
  });
});
afterEach(() => vi.restoreAllMocks());

function renderPanel(chartsRoot: () => Element | null = () => null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <TransportProvider transport={createMockTransport()}>
      <QueryClientProvider client={client}>
        <ExportPanel result={result} request={request} chartsRoot={chartsRoot} />
      </QueryClientProvider>
    </TransportProvider>,
  );
}

describe("ExportPanel (HU-12)", () => {
  it("downloads the series, the metrics and everything as JSON (AC1)", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Series (CSV)" }));
    fireEvent.click(screen.getByRole("button", { name: "Metrics (CSV)" }));
    fireEvent.click(screen.getByRole("button", { name: "Everything (JSON)" }));
    expect(downloads).toEqual([
      "lumen_-89.450_-137.310_2027-01-01_2027-01-03_series.csv",
      "lumen_-89.450_-137.310_2027-01-01_2027-01-03_metrics.csv",
      "lumen_-89.450_-137.310_2027-01-01_2027-01-03_analysis.json",
    ]);
  });

  it("lists the charts and downloads one as SVG (AC2)", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<svg role="img" aria-label="Horizon chart" viewBox="0 0 10 10"><circle r="2"></circle></svg>' +
      '<div role="img" aria-label="Sun visibility"><div role="img" aria-label="ECharts inner"><canvas></canvas></div></div>';
    document.body.append(root);
    renderPanel(() => root);
    fireEvent.click(screen.getByRole("button", { name: "Find charts on this page" }));
    // El gráfico de canvas se ofrece solo en PNG y sin duplicar el role="img" interno de ECharts.
    expect(screen.getByRole("button", { name: "Sun visibility as PNG" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sun visibility as SVG" })).toBeNull();
    expect(screen.queryByText("ECharts inner")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Horizon chart as SVG" }));
    expect(downloads).toEqual(["lumen_-89.450_-137.310_2027-01-01_2027-01-03_horizon-chart.svg"]);
    root.remove();
  });

  it("says when the page has no charts yet", () => {
    renderPanel(() => document.createElement("div"));
    fireEvent.click(screen.getByRole("button", { name: "Find charts on this page" }));
    expect(screen.getByText(/No chart has loaded on this page yet/)).toBeInTheDocument();
  });

  it("asks the engine for the PDF report and says when it cannot build one (AC3)", async () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Request PDF report" }));
    expect(await screen.findByText("The engine cannot build PDF reports yet.")).toBeInTheDocument();
  });
});
