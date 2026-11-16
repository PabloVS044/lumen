import { render, screen } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/horizon/horizon-polar", () => ({
  HorizonPolar: (p: {
    site: { lat: number; lon: number; obsHeightM: number };
    range: { start: string; end: string };
  }) => <div data-testid="polar" data-props={JSON.stringify(p)} />,
}));
vi.mock("@/components/terrain/local-terrain-section", () => ({
  LocalTerrainSection: () => <div data-testid="local" />,
}));
vi.mock("@/components/timeline/visibility-heatmap", () => ({
  VisibilityHeatmap: () => <div data-testid="heatmap" />,
}));

import { SiteCharts } from "./site-charts";

const setup = (search: string) =>
  render(
    <NuqsTestingAdapter searchParams={search}>
      <SiteCharts />
    </NuqsTestingAdapter>,
  );

describe("SiteCharts", () => {
  it("passes the site and range from the URL to both charts", () => {
    setup("?lat=-89.45&lon=-137.31&h=3&start=2027-01-01&end=2027-03-01");
    expect(JSON.parse(screen.getByTestId("polar").dataset.props!)).toEqual({
      site: { lat: -89.45, lon: -137.31, obsHeightM: 3 },
      range: { start: "2027-01-01", end: "2027-03-01" },
    });
    expect(screen.getByTestId("heatmap")).toBeInTheDocument();
    expect(screen.getByTestId("local")).toBeInTheDocument();
  });

  it("asks for a site and range when the URL has none", () => {
    setup("");
    expect(screen.getByText(/choose a site and a date range/i)).toBeInTheDocument();
    expect(screen.queryByTestId("polar")).not.toBeInTheDocument();
  });
});
