import { TransportProvider } from "@connectrpc/connect-query";
import { createMockTransport } from "@lumen/sdk/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useScenarioStore } from "@/stores/scenario-store";

vi.mock("./ground-view", () => ({
  GroundView: (p: {
    lat: number;
    lon: number;
    heightM: number;
    heading: number;
    fovDeg: number;
  }) => <div data-testid="ground-view" data-props={JSON.stringify(p)} />,
}));

import { project, type View } from "./panorama-math";
import { LocalTerrain } from "./local-terrain";

const site = { lat: -89.45, lon: -137.31, obsHeightM: 2 };
const range = { start: "2027-01-01", end: "2027-01-31" };

function setup(
  transport: ReturnType<typeof createMockTransport> = createMockTransport(),
  r: { start: string; end: string } = range,
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <TransportProvider transport={transport}>
      <QueryClientProvider client={client}>
        <LocalTerrain site={site} range={r} />
      </QueryClientProvider>
    </TransportProvider>,
  );
}

const chart = () => screen.findByRole("img", { name: /horizon from the site/i });
const num = (text: string, re: RegExp) => Number(re.exec(text)![1]);

beforeEach(() => {
  useScenarioStore.setState({ currentTime: "2027-01-15T06:00:00.000Z" });
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("LocalTerrain (engine horizon and shadow)", () => {
  it("draws the engine horizon, the terrain and the azimuth scale", async () => {
    vi.stubEnv("NEXT_PUBLIC_CESIUM_ION_TOKEN", "");
    setup();
    const svg = await chart();
    expect(svg.querySelector('[data-layer="engine-horizon"]')!.getAttribute("points")).toMatch(/,/);
    expect(svg.querySelector('[data-layer="terrain"]')).not.toBeNull();
    expect(svg.querySelectorAll('[data-layer="azimuth-scale"] text').length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("faces the Sun by default and places the Sun and the Earth at the engine's az/el", async () => {
    setup();
    const svg = await chart();
    const summary = screen.getByText(/Looking toward azimuth/).textContent!;
    const sunAz = num(summary, /Sun is at azimuth (-?[\d.]+)°/);
    const earthAz = num(summary, /Earth is at azimuth (-?[\d.]+)°/);
    const earthEl = num(summary, /Earth is at azimuth -?[\d.]+°, elevation (-?[\d.]+)°/);
    expect(num(summary, /Looking toward azimuth (-?[\d.]+)°/)).toBeCloseTo(sunAz, 1);
    const sun = svg.querySelector('[data-body="sun"] circle')!;
    expect(Number(sun.getAttribute("cx"))).toBeCloseTo(320, 0); // mira al Sol: centro de la imagen
    const view: View = { heading: sunAz, fovDeg: 60, width: 640, height: 280 };
    const expected = project({ az: earthAz, el: earthEl }, view);
    const earth = svg.querySelector('[data-body="earth"] circle');
    if (expected.inFront && expected.x > -20 && expected.x < 660) {
      expect(Number(earth!.getAttribute("cx"))).toBeCloseTo(expected.x, 0);
    } else {
      expect(earth).toBeNull();
    }
  });

  it("shows the shadow only when the engine says the Sun is below the terrain horizon", async () => {
    setup();
    const svg = await chart();
    const seen = new Set<string>();
    for (let day = 1; day <= 29; day += 2) {
      act(() =>
        useScenarioStore
          .getState()
          .setCurrentTime(`2027-01-${String(day).padStart(2, "0")}T00:00:00.000Z`),
      );
      const visible = svg.getAttribute("data-sun-visible")!;
      seen.add(visible);
      expect(svg.querySelector('[data-layer="shadow"]') !== null).toBe(visible === "false");
      expect(/The site is in shadow\./.test(document.body.textContent!)).toBe(visible === "false");
    }
    expect(seen).toEqual(new Set(["true", "false"]));
  });

  it("turns toward the Earth, and by hand with the azimuth slider", async () => {
    setup();
    await chart();
    const earthAz = num(
      screen.getByText(/Looking toward/).textContent!,
      /Earth is at azimuth (-?[\d.]+)°/,
    );
    fireEvent.click(screen.getByRole("button", { name: /face the earth/i }));
    expect(
      num(screen.getByText(/Looking toward/).textContent!, /Looking toward azimuth (-?[\d.]+)°/),
    ).toBeCloseTo(earthAz, 0);
    const slider = screen.getByRole("slider", { name: /direction/i });
    fireEvent.change(slider, { target: { value: "200" } });
    expect(screen.getByText(/Looking toward azimuth 200\.0°/)).toBeInTheDocument();
    expect(screen.getByText("200°")).toBeInTheDocument();
  });

  it("describes the view in text, including the horizon range", async () => {
    setup();
    await chart();
    expect(screen.getByText(/terrain horizon in view rises from/i)).toBeInTheDocument();
    expect(
      screen.getByText(/come from the engine, not from the terrain imagery/i),
    ).toBeInTheDocument();
  });
});

describe("LocalTerrain (Cesium Moon imagery option)", () => {
  it("hands the tileset camera the site and the observer height, not an engine terrain height", async () => {
    vi.stubEnv("NEXT_PUBLIC_CESIUM_ION_TOKEN", "tok");
    vi.stubEnv("NEXT_PUBLIC_CESIUM_MOON_ASSET_ID", "123");
    setup();
    await chart();
    const props = JSON.parse((await screen.findByTestId("ground-view")).dataset.props!);
    expect(props).toMatchObject({ lat: site.lat, lon: site.lon, observerHeightM: 2, fovDeg: 60 });
    // el motor da terrainHeightM (mock: 1500 m), pero el tileset está ~659 m más alto: no se usa
    expect(props.heightM).toBeUndefined();
    fireEvent.change(screen.getByRole("slider", { name: /direction/i }), {
      target: { value: "45" },
    });
    expect(JSON.parse(screen.getByTestId("ground-view").dataset.props!).heading).toBe(45);
    expect(screen.getByText(/NASA and the USGS Astrogeology Science Center/)).toBeInTheDocument();
  });

  it("can be switched off, leaving only the engine horizon", async () => {
    vi.stubEnv("NEXT_PUBLIC_CESIUM_ION_TOKEN", "tok");
    vi.stubEnv("NEXT_PUBLIC_CESIUM_MOON_ASSET_ID", "123");
    setup();
    await chart();
    await screen.findByTestId("ground-view");
    fireEvent.click(screen.getByRole("checkbox", { name: /moon terrain imagery/i }));
    expect(screen.queryByTestId("ground-view")).not.toBeInTheDocument();
    expect(screen.queryByText(/USGS Astrogeology/)).not.toBeInTheDocument();
  });

  it("works without a Cesium ion token: engine horizon only, with a note", async () => {
    vi.stubEnv("NEXT_PUBLIC_CESIUM_ION_TOKEN", "");
    setup();
    await chart();
    expect(screen.getByRole("checkbox", { name: /moon terrain imagery/i })).toBeDisabled();
    expect(screen.getByText(/showing the engine horizon only/i)).toBeInTheDocument();
    expect(screen.queryByTestId("ground-view")).not.toBeInTheDocument();
  });
});

describe("LocalTerrain (states)", () => {
  it("explains an engine failure in text", async () => {
    const failing = {
      unary: () => Promise.reject(new Error("engine down")),
      stream: () => Promise.reject(new Error("engine down")),
    } as unknown as ReturnType<typeof createMockTransport>;
    setup(failing);
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load the horizon/i);
  });

  it("says so when the range is not valid", () => {
    setup(createMockTransport(), { start: "2027-02-01", end: "2027-01-01" });
    expect(screen.getByText(/range is not valid/i)).toBeInTheDocument();
  });
});
