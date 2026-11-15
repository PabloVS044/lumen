import { TransportProvider } from "@connectrpc/connect-query";
import { createMockTransport } from "@lumen/sdk/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useScenarioStore } from "@/stores/scenario-store";

import { HorizonPolar } from "./horizon-polar";

const site = { lat: -89.45, lon: -137.31, obsHeightM: 2 };
const range = { start: "2027-01-01", end: "2027-01-31" };

function setup(transport: ReturnType<typeof createMockTransport> = createMockTransport()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <TransportProvider transport={transport}>
      <QueryClientProvider client={client}>
        <HorizonPolar site={site} range={range} />
      </QueryClientProvider>
    </TransportProvider>,
  );
}

const chart = () => screen.findByRole("img", { name: /sun and earth paths/i });
const layer = (svg: Element, name: string) => svg.querySelector(`[data-layer="${name}"]`);

beforeEach(() => {
  useScenarioStore.setState({ currentTime: null });
});

describe("HorizonPolar", () => {
  it("draws every layer of section 12.2 from the engine data", async () => {
    setup();
    const svg = await chart();
    for (const name of [
      "sky",
      "terrain",
      "horizon-lines",
      "dip",
      "cardinals",
      "sun-path",
      "earth-path",
    ]) {
      expect(layer(svg, name), name).not.toBeNull();
    }
    for (const c of ["N", "E", "S", "W"]) expect(svg).toHaveTextContent(c);
    expect(layer(svg, "terrain")!.querySelector("path")!.getAttribute("d")).toMatch(/^M/);
  });

  it("draws the parts below the terrain horizon dotted", async () => {
    setup();
    const svg = await chart();
    const hidden = [...svg.querySelectorAll('path[data-visible="false"]')];
    expect(hidden.length).toBeGreaterThan(0);
    for (const p of hidden) expect(p.getAttribute("stroke-dasharray")).toBeTruthy();
    const visible = svg.querySelector('path[data-visible="true"]');
    expect(visible?.getAttribute("stroke-dasharray")).toBeNull();
  });

  it("zooms the radial scale on demand", async () => {
    setup();
    const svg = await chart();
    const ring = () => Number(svg.querySelector('[data-layer="sky"] g circle')!.getAttribute("r"));
    const full = ring();
    fireEvent.click(screen.getByRole("button", { name: /zoom to 15/i }));
    expect(screen.getByRole("button", { name: /zoom to 15/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(ring()).not.toBe(full);
  });

  it("describes the chart in text, including the current time when there is one", async () => {
    useScenarioStore.setState({ currentTime: "2027-01-15T06:00:00.000Z" });
    setup();
    await chart();
    expect(screen.getByText(/terrain horizon peaks at/i)).toBeInTheDocument();
    expect(screen.getByText(/% of the time/)).toBeInTheDocument();
    expect(screen.getByText(/At 2027-01-15 06:00 UTC the Sun is at azimuth/)).toBeInTheDocument();
    expect(layer(await chart(), "now")!.querySelectorAll("circle")).toHaveLength(2);
  });

  it("sets currentTime when a trajectory is clicked", async () => {
    setup();
    const svg = await chart();
    // Primer punto de la trayectoria del Sol (muestra 0): su posición en el viewBox 360x360.
    const d = layer(svg, "sun-path")!.querySelector("path")!.getAttribute("d")!;
    const [x, y] = d.slice(1).split("L")[0]!.split(",").map(Number) as [number, number];
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 360, height: 360 }) as DOMRect;
    fireEvent.click(svg, { clientX: x! + 180, clientY: y! + 180 });
    expect(useScenarioStore.getState().currentTime).toBe("2027-01-01T00:00:00.000Z");
  });

  it("explains an engine failure in text", async () => {
    const failing = {
      unary: () => Promise.reject(new Error("engine down")),
      stream: () => Promise.reject(new Error("engine down")),
    } as unknown as ReturnType<typeof createMockTransport>;
    setup(failing);
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load the horizon/i);
  });

  it("says so when the range is not valid", () => {
    const client = new QueryClient();
    render(
      <TransportProvider transport={createMockTransport()}>
        <QueryClientProvider client={client}>
          <HorizonPolar site={site} range={{ start: "2027-02-01", end: "2027-01-01" }} />
        </QueryClientProvider>
      </TransportProvider>,
    );
    expect(screen.getByText(/range is not valid/i)).toBeInTheDocument();
  });
});
