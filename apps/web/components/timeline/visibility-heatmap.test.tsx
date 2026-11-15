import { TransportProvider } from "@connectrpc/connect-query";
import { createMockTransport } from "@lumen/sdk/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useScenarioStore } from "@/stores/scenario-store";

interface PanelProps {
  option: {
    visualMap: { pieces: { color: string }[] };
    series: { type: string; data: unknown[][] }[];
  };
  label: string;
  onCellClick: (day: number, hour: number) => void;
}
const panels: PanelProps[] = [];

vi.mock("./heat-chart", () => ({
  HeatChart: (props: PanelProps) => {
    panels.push(props);
    return <div data-testid="panel" aria-label={props.label} />;
  },
}));

import { VisibilityHeatmap } from "./visibility-heatmap";

const site = { lat: -89.45, lon: -137.31, obsHeightM: 2 };
const range = { start: "2027-01-01", end: "2027-01-31" };

function setup(transport: ReturnType<typeof createMockTransport> = createMockTransport()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <TransportProvider transport={transport}>
      <QueryClientProvider client={client}>
        <VisibilityHeatmap site={site} range={range} />
      </QueryClientProvider>
    </TransportProvider>,
  );
}

const latest = (name: string) => panels.findLast((p) => p.label.startsWith(name))!;

beforeEach(() => {
  panels.length = 0;
  useScenarioStore.setState({ currentTime: null });
  document.documentElement.style.setProperty("--color-good", "green");
  document.documentElement.style.setProperty("--color-text", "white");
});

describe("VisibilityHeatmap", () => {
  it("renders one panel each for Sun, Earth and Operable, days x UTC hours", async () => {
    setup();
    await screen.findAllByTestId("panel");
    expect(screen.getAllByTestId("panel")).toHaveLength(3);
    for (const n of ["Sun", "Earth", "Operable"]) expect(latest(n)).toBeDefined();
    const heat = latest("Sun").option.series[0]!;
    expect(heat.type).toBe("heatmap");
    expect(heat.data.length).toBeGreaterThan(24 * 25);
    expect(heat.data.every((c) => (c[0] as number) >= 0 && (c[0] as number) <= 23)).toBe(true);
  });

  it("outlines the longest dark spell on the Sun panel and the longest blackout on the Earth panel", async () => {
    setup();
    await screen.findAllByTestId("panel");
    expect(latest("Sun").option.series[1]!.data.length).toBeGreaterThan(0);
    expect(latest("Earth").option.series[1]!.data.length).toBeGreaterThan(0);
    expect(latest("Operable").option.series[1]!.data).toHaveLength(0);
  });

  it("marks the current time as one cell, only when it falls inside the range", async () => {
    useScenarioStore.setState({ currentTime: "2027-01-03T06:30:00.000Z" });
    setup();
    await screen.findAllByTestId("panel");
    expect(latest("Sun").option.series[2]!.data).toEqual([[6, 7, 2]]);
    panels.length = 0;
    useScenarioStore.setState({ currentTime: "2028-01-01T00:00:00.000Z" });
    await screen.findAllByTestId("panel");
    expect(latest("Sun").option.series[2]!.data).toHaveLength(0);
  });

  it("moves the current time when a cell is clicked", async () => {
    setup();
    await screen.findAllByTestId("panel");
    latest("Sun").onCellClick(1, 6);
    expect(useScenarioStore.getState().currentTime).toBe("2027-01-02T06:00:00.000Z");
  });

  it("offers a high contrast palette that does not rely on red versus green", async () => {
    setup();
    await screen.findAllByTestId("panel");
    expect(latest("Sun").option.visualMap.pieces[2]!.color).toBe("green");
    fireEvent.click(screen.getByRole("checkbox", { name: /high contrast/i }));
    expect(latest("Sun").option.visualMap.pieces[2]!.color).toBe("white");
  });

  it("describes the chart in text and offers a table view with one row per day", async () => {
    setup();
    expect(await screen.findByText(/Sun is visible .*% of the time/)).toBeInTheDocument();
    expect(screen.getByText(/longest dark spell lasts/)).toBeInTheDocument();
    const table = screen.getByRole("table", { hidden: true });
    expect(within(table).getAllByRole("row", { hidden: true }).length).toBeGreaterThan(30);
  });

  it("explains an engine failure in text", async () => {
    const failing = {
      unary: () => Promise.reject(new Error("engine down")),
      stream: () => Promise.reject(new Error("engine down")),
    } as unknown as ReturnType<typeof createMockTransport>;
    setup(failing);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not load the visibility timeline/i,
    );
  });
});
