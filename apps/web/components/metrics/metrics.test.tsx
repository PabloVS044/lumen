import { create } from "@bufbuild/protobuf";
import { timestampDate, timestampFromDate } from "@bufbuild/protobuf/wkt";
import { AnalyzeRequestSchema } from "@lumen/sdk";
import { mockAnalysis } from "@lumen/sdk/mocks";
import { TransportProvider } from "@connectrpc/connect-query";
import { createMockTransport } from "@lumen/sdk/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it } from "vitest";

import { useScenarioStore } from "@/stores/scenario-store";

import { formatDuration } from "@/lib/format";

import { Countdowns, CountdownsView } from "./countdowns";
import { MetricsPanel, MetricsView } from "./metrics-panel";

const start = Date.UTC(2027, 0, 1);
const result = mockAnalysis(
  create(AnalyzeRequestSchema, {
    site: { lat: -89.45, lon: -137.31, obsHeightM: 2 },
    range: {
      start: timestampFromDate(new Date(start)),
      end: timestampFromDate(new Date(start + 30 * 86_400_000)),
      stepMinutes: 30,
    },
  }),
);
const s = result.series!;
const times = s.time.map((t) => timestampDate(t).getTime());
const m = result.metrics!;

describe("MetricsPanel (M7)", () => {
  it("groups the key figures from the engine", () => {
    render(<MetricsView result={result} />);
    const energy = screen.getByRole("region", { name: "Sunlight" });
    expect(within(energy).getByText(`${m.illuminationPct.toFixed(1)}%`)).toBeInTheDocument();
    expect(within(energy).getByText("Longest dark period")).toBeInTheDocument();

    const comm = screen.getByRole("region", { name: "Earth contact" });
    expect(within(comm).getByText(`${m.earthVisiblePct.toFixed(1)}%`)).toBeInTheDocument();
    expect(within(comm).getByText(formatDuration(m.longestCommBlackoutH))).toBeInTheDocument();

    const ops = screen.getByRole("region", { name: "Operations" });
    expect(within(ops).getByText(`${m.operablePct.toFixed(1)}%`)).toBeInTheDocument();
  });

  it("flags a dark period cut by the edge of the range as a lower bound", () => {
    const cut = structuredClone(result);
    cut.metrics!.longestDarkInterval!.truncated = true;
    render(<MetricsView result={cut} />);
    expect(screen.getByText(`≥ ${formatDuration(m.longestDarkH)}`)).toBeInTheDocument();
    expect(screen.getByText(/touches the edge of the period/)).toBeInTheDocument();
  });
});

describe("Countdowns (HU-06)", () => {
  it("counts down to the next sunset while the Sun is up (AC1)", () => {
    const i = s.sunVisible.findIndex((v, k) => v && k > 10);
    render(<CountdownsView result={result} currentMs={times[i]!} />);
    const sun = screen.getByRole("group", { name: "Sun" });
    expect(sun).toHaveTextContent("The Sun is up");
    expect(sun).toHaveTextContent(/Sets in \d+/);
  });

  it("counts down to the next sunrise while the Sun is down (AC2)", () => {
    const i = s.sunVisible.findIndex((v, k) => !v && k > 10);
    render(<CountdownsView result={result} currentMs={times[i]!} />);
    const sun = screen.getByRole("group", { name: "Sun" });
    expect(sun).toHaveTextContent("The Sun is down");
    expect(sun).toHaveTextContent(/Rises in \d+/);
  });

  it("says when nothing changes before the end of the period", () => {
    render(<CountdownsView result={result} currentMs={times.at(-1)!} />);
    expect(screen.getByRole("group", { name: "Earth" })).toHaveTextContent(
      /No Earth(set|rise) before the end of the period/,
    );
  });
});

describe("MetricsPanel and Countdowns with the engine", () => {
  const site = { lat: -89.45, lon: -137.31, obsHeightM: 2 };
  const range = { start: "2027-01-01T00:00:00.000Z", end: "2027-01-31T00:00:00.000Z" };
  beforeEach(() => useScenarioStore.setState({ currentTime: null }));

  function renderLive(ui: React.ReactNode, searchParams = "") {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <TransportProvider transport={createMockTransport()}>
        <QueryClientProvider client={client}>
          <NuqsTestingAdapter searchParams={searchParams}>{ui}</NuqsTestingAdapter>
        </QueryClientProvider>
      </TransportProvider>,
    );
  }

  it("loads the metrics for a site and range", async () => {
    renderLive(<MetricsPanel site={site} range={range} />);
    expect(screen.getByText("Loading metrics…")).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "Sunlight" })).toBeInTheDocument();
  });

  it("counts from t in the URL when the clock has not moved", async () => {
    renderLive(<Countdowns site={site} range={range} />, "t=2027-01-10T12:00:00Z");
    const sun = await screen.findByRole("group", { name: "Sun" });
    expect(sun).toHaveTextContent(/(Sets|Rises) in|No (Sunset|Sunrise) before/);
  });

  it("explains an invalid range", () => {
    renderLive(<MetricsPanel site={site} range={{ start: range.end, end: range.start }} />);
    expect(screen.getByText("The date range is not valid.")).toBeInTheDocument();
  });
});
