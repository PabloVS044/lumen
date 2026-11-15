import { TransportProvider } from "@connectrpc/connect-query";
import { mockCatalog } from "@lumen/sdk/mocks";
import type { createMockTransport } from "@lumen/sdk/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useScenarioStore } from "@/stores/scenario-store";

import { SitePanel } from "./site-panel";

const T = "2027-01-15T06:00:00.000Z";
const range = { start: "2027-01-01", end: "2027-03-01" };
const sec = (iso: string) => ({ seconds: BigInt(Date.parse(iso) / 1000), nanos: 0 });
// Transporte mínimo: GetSeries con muestras fijas de prueba (sol bajo el horizonte, Tierra sobre él).
const transport = {
  unary: () =>
    Promise.resolve({
      message: {
        time: [sec("2027-01-15T06:00:00Z"), sec("2027-01-15T06:30:00Z")],
        sun: { azDeg: [123.4, 130], elDeg: [-0.8, -0.5] },
        earth: { azDeg: [5, 6], elDeg: [2.1, 2.2] },
      },
    }),
  stream: () => Promise.reject(new Error("no streams")),
} as unknown as ReturnType<typeof createMockTransport>;

const site = mockCatalog[0]!;

function setup(s = site) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <TransportProvider transport={transport}>
      <QueryClientProvider client={client}>
        <SitePanel site={s} range={range} />
      </QueryClientProvider>
    </TransportProvider>,
  );
}

const active = (n: number) => ({
  id: `other-${n}`,
  name: `Other ${n}`,
  lat: 0,
  lon: 0,
  obsHeightM: 2,
  color: `var(--color-site-${n})`,
});

beforeEach(() => {
  useScenarioStore.setState({ sites: [], currentTime: T, playing: false });
});

describe("SitePanel", () => {
  it("shows the site and flags coordinates that are not verified", () => {
    setup();
    expect(screen.getByRole("heading", { name: site.name })).toBeInTheDocument();
    expect(screen.getByText(/not verified/i)).toBeInTheDocument();
  });

  it("shows Sun and Earth az/el from the engine and whether each is above the horizon", async () => {
    setup();
    const sun = await screen.findByText(/az 123\.4° el -0\.8°/);
    expect(sun).toHaveTextContent("below horizon");
    expect(screen.getByText(/az 5\.0° el 2\.1°/)).toHaveTextContent("above horizon");
  });

  it("adds the site to the comparison with the first free site color, and removes it", () => {
    useScenarioStore.setState({ sites: [active(1)] });
    setup();
    fireEvent.click(screen.getByRole("button", { name: /add to compare/i }));
    const added = useScenarioStore.getState().sites.at(-1)!;
    expect(added).toMatchObject({ id: site.id, name: site.name, lat: site.lat, lon: site.lon });
    expect(added.color).toBe("var(--color-site-2)");
    fireEvent.click(screen.getByRole("button", { name: /remove from comparison/i }));
    expect(useScenarioStore.getState().sites.some((s) => s.id === site.id)).toBe(false);
  });

  it("disables adding at four sites and explains why", () => {
    useScenarioStore.setState({ sites: [1, 2, 3, 4].map(active) });
    setup();
    expect(screen.getByRole("button", { name: /add to compare/i })).toBeDisabled();
    expect(screen.getByText(/up to 4 sites/i)).toBeInTheDocument();
  });

  it("links to /site and /compare with the URL state", () => {
    useScenarioStore.setState({ sites: [active(1)] });
    setup();
    const siteLink = screen.getByRole("link", { name: /site detail/i }).getAttribute("href")!;
    const url = new URL(siteLink, "http://x");
    expect(url.pathname).toBe("/site");
    expect(url.searchParams.get("lat")).toBe(String(site.lat));
    expect(url.searchParams.get("t")).toBe(T);
    expect(screen.getByRole("link", { name: /compare/i }).getAttribute("href")).toBe(
      "/compare?s=0,0,2027-01-01,2027-03-01",
    );
  });

  it("announces a text summary only while paused", async () => {
    const { container } = setup();
    await screen.findByText(/az 123\.4°/);
    const live = container.querySelector("[aria-live='polite']")!;
    expect(live.textContent).toMatch(/Sun .*123\.4/);
    expect(live.textContent).toMatch(/Earth .*above the horizon/);
    useScenarioStore.setState({ playing: true });
    await screen.findByText(/az 123\.4°/);
    expect(container.querySelector("[aria-live='polite']")!.textContent).toBe("");
  });
});
