import { mockCatalog } from "@lumen/sdk/mocks";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useScenarioStore } from "@/stores/scenario-store";

vi.mock("cesium", () => ({
  Ellipsoid: { MOON: { name: "moon" } },
  Cartesian2: class {
    constructor(
      public x: number,
      public y: number,
    ) {}
  },
  Cartesian3: { fromDegrees: (lon: number, lat: number) => ({ lon, lat }) },
  Color: { fromCssColorString: (css: string) => ({ css }) },
  DistanceDisplayCondition: class {
    constructor(
      public near: number,
      public far: number,
    ) {}
  },
}));

interface MockEntityProps {
  id: string;
  point: { color: { css: string } };
  label: { show: boolean; distanceDisplayCondition?: unknown };
  onClick: () => void;
}

vi.mock("resium", () => ({
  Entity: ({ id, point, label, onClick }: MockEntityProps) => (
    <button
      data-testid={`marker-${id}`}
      data-color={point.color.css}
      data-label={String(label.show)}
      data-label-range={label.distanceDisplayCondition ? "near" : "always"}
      onClick={onClick}
    />
  ),
}));

import { SiteMarkers } from "./site-markers";

beforeEach(() => {
  useScenarioStore.setState({ sites: [] });
  document.documentElement.style.setProperty("--color-muted", "gray");
  document.documentElement.style.setProperty("--color-text", "white");
});

describe("SiteMarkers", () => {
  it("renders one marker per catalog site", () => {
    render(<SiteMarkers sites={mockCatalog} onSelect={() => {}} />);
    for (const s of mockCatalog) expect(screen.getByTestId(`marker-${s.id}`)).toBeInTheDocument();
  });

  it("calls onSelect with the clicked site", () => {
    const onSelect = vi.fn();
    render(<SiteMarkers sites={mockCatalog} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId(`marker-${mockCatalog[1]!.id}`));
    expect(onSelect).toHaveBeenCalledWith(mockCatalog[1]);
  });

  it("paints sites of the scenario with their store color and the rest with the muted token", () => {
    useScenarioStore.setState({
      sites: [
        { id: mockCatalog[0]!.id, name: "a", lat: 0, lon: 0, obsHeightM: 2, color: "tomato" },
      ],
    });
    render(<SiteMarkers sites={mockCatalog} onSelect={() => {}} />);
    expect(screen.getByTestId(`marker-${mockCatalog[0]!.id}`)).toHaveAttribute(
      "data-color",
      "tomato",
    );
    expect(screen.getByTestId(`marker-${mockCatalog[1]!.id}`)).toHaveAttribute(
      "data-color",
      "gray",
    );
  });

  it("resolves var(--token) colors from the store", () => {
    document.documentElement.style.setProperty("--color-site-1", "hotpink");
    useScenarioStore.setState({
      sites: [
        {
          id: mockCatalog[0]!.id,
          name: "a",
          lat: 0,
          lon: 0,
          obsHeightM: 2,
          color: "var(--color-site-1)",
        },
      ],
    });
    render(<SiteMarkers sites={mockCatalog} onSelect={() => {}} />);
    expect(screen.getByTestId(`marker-${mockCatalog[0]!.id}`)).toHaveAttribute(
      "data-color",
      "hotpink",
    );
  });

  it("shows the label only near the site, and always for the selected one", () => {
    render(<SiteMarkers sites={mockCatalog} selectedId={mockCatalog[2]!.id} onSelect={() => {}} />);
    const other = screen.getByTestId(`marker-${mockCatalog[0]!.id}`);
    expect(other).toHaveAttribute("data-label-range", "near");
    const selected = screen.getByTestId(`marker-${mockCatalog[2]!.id}`);
    expect(selected).toHaveAttribute("data-label-range", "always");
    expect(selected).toHaveAttribute("data-label", "true");
    expect(selected).toHaveAttribute("data-color", "white");
  });
});
