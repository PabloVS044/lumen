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
  HeightReference: { CLAMP_TO_3D_TILE: 5 },
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
  point: { color: { css: string }; heightReference?: number; disableDepthTestDistance?: number };
  label: {
    show: boolean;
    disableDepthTestDistance?: number;
    text: string;
    heightReference?: number;
    distanceDisplayCondition?: unknown;
  };
  onClick: () => void;
}

vi.mock("resium", () => ({
  Entity: ({ id, point, label, onClick }: MockEntityProps) => (
    <button
      data-testid={`marker-${id}`}
      data-color={point.color.css}
      data-label={String(label.show)}
      data-text={label.text}
      data-point-ref={String(point.heightReference)}
      data-label-ref={String(label.heightReference)}
      data-depth={String(point.disableDepthTestDistance)}
      data-label-depth={String(label.disableDepthTestDistance)}
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

  it("states in text whether the Sun and the Earth are visible from the selected site", () => {
    render(
      <SiteMarkers
        sites={mockCatalog}
        selectedId={mockCatalog[0]!.id}
        selectedStatus={{ sun: true, earth: false }}
        onSelect={() => {}}
      />,
    );
    const text = screen.getByTestId(`marker-${mockCatalog[0]!.id}`).getAttribute("data-text")!;
    expect(text).toContain(mockCatalog[0]!.name);
    expect(text).toContain("Sun visible");
    expect(text).toContain("Earth not visible");
  });

  it("shows only the name while the status is unknown, and never labels other sites with a status", () => {
    render(
      <SiteMarkers
        sites={mockCatalog}
        selectedId={mockCatalog[0]!.id}
        selectedStatus={{ sun: true, earth: true }}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByTestId(`marker-${mockCatalog[1]!.id}`)).toHaveAttribute(
      "data-text",
      mockCatalog[1]!.name,
    );
  });

  it("clamps points and labels to the tileset's own surface", () => {
    render(<SiteMarkers sites={mockCatalog} onSelect={() => {}} />);
    for (const site of mockCatalog) {
      const marker = screen.getByTestId(`marker-${site.id}`);
      expect(marker).toHaveAttribute("data-point-ref", "5"); // CLAMP_TO_3D_TILE
      expect(marker).toHaveAttribute("data-label-ref", "5");
    }
  });

  it("only bypasses the depth test close up (points) or always (labels), so far-side points stay hidden", () => {
    render(<SiteMarkers sites={mockCatalog} onSelect={() => {}} />);
    const marker = screen.getByTestId(`marker-${mockCatalog[0]!.id}`);
    const pointDepth = Number(marker.getAttribute("data-depth"));
    expect(pointDepth).toBeGreaterThan(0);
    expect(pointDepth).toBeLessThanOrEqual(100_000); // 3 500 km de la vista inicial: con prueba de profundidad
    expect(marker.getAttribute("data-label-depth")).toBe("Infinity");
  });

  it("never hides the selected site's point behind relief, unlike the other points", () => {
    render(<SiteMarkers sites={mockCatalog} selectedId={mockCatalog[0]!.id} onSelect={() => {}} />);
    expect(screen.getByTestId(`marker-${mockCatalog[0]!.id}`).getAttribute("data-depth")).toBe(
      "Infinity",
    );
    expect(
      Number(screen.getByTestId(`marker-${mockCatalog[1]!.id}`).getAttribute("data-depth")),
    ).toBeLessThanOrEqual(100_000);
  });
});
