import { TransportProvider } from "@connectrpc/connect-query";
import type { CatalogSite } from "@lumen/sdk";
import { createMockTransport, mockCatalog } from "@lumen/sdk/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useScenarioStore } from "@/stores/scenario-store";

vi.mock("@/components/globe/globe-loader", () => ({
  GlobeLoader: ({
    selectedSiteId,
    onSelectSite,
  }: {
    selectedSiteId?: string;
    onSelectSite: (s: CatalogSite) => void;
  }) => (
    <div data-testid="globe" data-selected={selectedSiteId}>
      <button onClick={() => onSelectSite(mockCatalog[1]!)}>pick on globe</button>
    </div>
  ),
}));
vi.mock("@/components/time-controls/time-controls", () => ({
  TimeControls: ({ site }: { site?: { lat: number; lon: number } }) => (
    <div data-testid="time" data-site={site ? `${site.lat},${site.lon}` : ""} />
  ),
}));
vi.mock("@/components/site-picker/site-picker", () => ({ SitePicker: () => null }));
vi.mock("./site-panel", () => ({
  SitePanel: ({ site, range }: { site: CatalogSite; range: { start: string; end: string } }) => (
    <div data-testid="panel" data-name={site.name} data-range={`${range.start}/${range.end}`} />
  ),
}));

import { ExploreView } from "./explore-view";

function setup(search = "?t=2027-01-15T06:00:00Z&start=2027-01-01&end=2027-03-01") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <NuqsTestingAdapter searchParams={search}>
      <TransportProvider transport={createMockTransport()}>
        <QueryClientProvider client={client}>
          <ExploreView />
        </QueryClientProvider>
      </TransportProvider>
    </NuqsTestingAdapter>,
  );
}

beforeEach(() => {
  useScenarioStore.setState({ sites: [], currentTime: null, playing: false });
});

describe("ExploreView", () => {
  it("asks to pick a site before there is a selection", () => {
    setup();
    expect(screen.getByRole("heading", { level: 1, name: /explore/i })).toBeInTheDocument();
    expect(screen.getByText(/to see its detail/i)).toBeInTheDocument();
    expect(screen.queryByTestId("panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("time")).toHaveAttribute("data-site", "");
  });

  it("selects from the globe: panel, highlighted marker and time controls follow", () => {
    setup();
    fireEvent.click(screen.getByText("pick on globe"));
    const site = mockCatalog[1]!;
    expect(screen.getByTestId("panel")).toHaveAttribute("data-name", site.name);
    expect(screen.getByTestId("panel")).toHaveAttribute("data-range", "2027-01-01/2027-03-01");
    expect(screen.getByTestId("globe")).toHaveAttribute("data-selected", site.id);
    expect(screen.getByTestId("time")).toHaveAttribute("data-site", `${site.lat},${site.lon}`);
  });

  it("offers a keyboard-reachable site list as an alternative to clicking the globe", async () => {
    setup();
    await screen.findByRole("option", { name: mockCatalog[2]!.name });
    const select = screen.getByRole("combobox", { name: /site/i });
    fireEvent.change(select, { target: { value: mockCatalog[2]!.id } });
    expect(screen.getByTestId("panel")).toHaveAttribute("data-name", mockCatalog[2]!.name);
  });

  it("falls back to the current time for the link range when the URL has no window", () => {
    useScenarioStore.setState({ currentTime: "2027-01-15T06:00:00.000Z" });
    setup("");
    fireEvent.click(screen.getByText("pick on globe"));
    expect(screen.getByTestId("panel")).toHaveAttribute("data-range", "2027-01-15/2027-02-14");
  });
});
