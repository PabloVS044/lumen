import { TransportProvider } from "@connectrpc/connect-query";
import { createMockTransport } from "@lumen/sdk/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useScenarioStore } from "@/stores/scenario-store";

import { HorizonUnrolled } from "./horizon-unrolled";

const site = { lat: -89.45, lon: -137.31, obsHeightM: 2 };
const range = { start: "2027-01-01T00:00:00Z", end: "2027-01-31T00:00:00Z" };

function renderChart() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <TransportProvider transport={createMockTransport()}>
      <QueryClientProvider client={client}>
        <HorizonUnrolled site={site} range={range} />
      </QueryClientProvider>
    </TransportProvider>,
  );
}

beforeEach(() => useScenarioStore.setState({ currentTime: null }));

describe("HorizonUnrolled (M2 variant, section 12.2)", () => {
  it("loads, then draws terrain, 0°, the mathematical horizon and both paths", async () => {
    const { container } = renderChart();
    expect(screen.getByText("Loading horizon…")).toBeInTheDocument();
    await screen.findByRole("img", { name: "Unrolled horizon" });
    const q = (s: string) => container.querySelectorAll(s);
    expect(q('[data-layer="terrain"]')).toHaveLength(1);
    expect(q('[data-layer="zero"]')).toHaveLength(1);
    expect(q('[data-layer="dip"]')).toHaveLength(1);
    expect(q('[data-layer^="sun-"]').length).toBeGreaterThan(0);
    expect(q('[data-layer^="earth-"]').length).toBeGreaterThan(0);
  });

  it("dots hidden stretches and keeps visible ones solid", async () => {
    const { container } = renderChart();
    await screen.findByRole("img", { name: "Unrolled horizon" });
    for (const p of container.querySelectorAll('[data-layer$="-hidden"]')) {
      expect(p).toHaveAttribute("stroke-dasharray");
    }
    for (const p of container.querySelectorAll('[data-layer$="-visible"]')) {
      expect(p).not.toHaveAttribute("stroke-dasharray");
    }
  });

  it("marks the bodies at the current time and describes them", async () => {
    useScenarioStore.setState({ currentTime: "2027-01-05T04:00:00.000Z" });
    const { container } = renderChart();
    const chart = await screen.findByRole("img", { name: "Unrolled horizon" });
    expect(container.querySelectorAll("[data-marker]")).toHaveLength(2);
    expect(chart).toHaveAccessibleDescription(expect.stringContaining("At 2027-01-05 04:00 UTC"));
  });

  it("zooms on the horizon band by default and can show the whole sky", async () => {
    renderChart();
    await screen.findByRole("img", { name: "Unrolled horizon" });
    expect(screen.getByRole("radio", { name: "Horizon band" })).toBeChecked();
    expect(screen.queryByText("60°")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Whole sky" }));
    expect(screen.getByText("60°")).toBeInTheDocument();
  });

  it("labels the azimuth axis with directions", async () => {
    renderChart();
    await screen.findByRole("img", { name: "Unrolled horizon" });
    for (const c of ["N", "E", "S", "W"]) expect(screen.getAllByText(c).length).toBeGreaterThan(0);
  });
});
