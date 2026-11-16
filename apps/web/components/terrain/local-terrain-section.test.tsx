import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./local-terrain", () => ({
  LocalTerrain: (p: unknown) => <div data-testid="local-terrain" data-props={JSON.stringify(p)} />,
}));

import { LocalTerrainSection } from "./local-terrain-section";

const props = {
  site: { lat: -89.45, lon: -137.31, obsHeightM: 2 },
  range: { start: "2027-01-01", end: "2027-02-01" },
};

describe("LocalTerrainSection", () => {
  it("does not mount the local view (and its Cesium viewer) until it is opened", () => {
    render(<LocalTerrainSection {...props} />);
    expect(screen.queryByTestId("local-terrain")).not.toBeInTheDocument();
    const details = screen.getByText(/local terrain view/i).closest("details")!;
    details.open = true;
    fireEvent(details, new Event("toggle"));
    expect(JSON.parse(screen.getByTestId("local-terrain").dataset.props!)).toEqual(props);
    details.open = false;
    fireEvent(details, new Event("toggle"));
    expect(screen.queryByTestId("local-terrain")).not.toBeInTheDocument();
  });
});
