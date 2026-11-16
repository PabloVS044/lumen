import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { Ellipsoid, IonResource } = vi.hoisted(() => ({
  Ellipsoid: { MOON: { name: "moon", radii: { x: 1737400, y: 1737400, z: 1737400 } } },
  IonResource: {
    fromAssetId: vi.fn((id: number, opts: { accessToken?: string }) =>
      Promise.resolve({ assetId: id, token: opts.accessToken }),
    ),
  },
}));

vi.mock("cesium", () => ({
  Ellipsoid,
  IonResource,
  Cartesian3: { ZERO: { x: 0, y: 0, z: 0 } },
  Color: { fromCssColorString: (css: string) => ({ css }) },
}));

vi.mock("resium", () => ({
  Viewer: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    baseLayer?: boolean;
    ellipsoid?: { name: string };
  }) => (
    <div
      data-testid="viewer"
      data-ellipsoid={props.ellipsoid?.name}
      data-base-layer={String(props.baseLayer)}
    >
      {children}
    </div>
  ),
  Cesium3DTileset: () => <div data-testid="tileset" />,
  Entity: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="fallback-sphere">{children}</div>
  ),
  EllipsoidGraphics: () => null,
  Globe: ({ show }: { show?: boolean }) => (
    <div data-testid="cesium-globe" data-show={String(show)} />
  ),
}));

import { Globe } from "./globe";

beforeEach(() => {
  IonResource.fromAssetId.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Globe", () => {
  it("falls back to a plain sphere with a banner when the ion token is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_CESIUM_ION_TOKEN", "");
    vi.stubEnv("NEXT_PUBLIC_CESIUM_MOON_ASSET_ID", "123");
    render(<Globe />);
    expect(screen.getByRole("status")).toHaveTextContent(/token/i);
    expect(screen.getByTestId("fallback-sphere")).toBeInTheDocument();
    expect(screen.queryByTestId("tileset")).not.toBeInTheDocument();
  });

  it("falls back when the Moon asset id is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_CESIUM_ION_TOKEN", "tok");
    vi.stubEnv("NEXT_PUBLIC_CESIUM_MOON_ASSET_ID", "");
    render(<Globe />);
    expect(screen.getByRole("status")).toHaveTextContent(/asset/i);
    expect(screen.queryByTestId("tileset")).not.toBeInTheDocument();
  });

  it("mounts the ion tileset and no banner when token and asset id are set", () => {
    vi.stubEnv("NEXT_PUBLIC_CESIUM_ION_TOKEN", "tok");
    vi.stubEnv("NEXT_PUBLIC_CESIUM_MOON_ASSET_ID", "123");
    render(<Globe />);
    expect(screen.getByTestId("tileset")).toBeInTheDocument();
    expect(IonResource.fromAssetId).toHaveBeenCalledWith(123, { accessToken: "tok" });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByTestId("fallback-sphere")).not.toBeInTheDocument();
  });

  it("creates the viewer with the lunar ellipsoid, no imagery and the default globe hidden", () => {
    render(<Globe />);
    const viewer = screen.getByTestId("viewer");
    expect(viewer).toHaveAttribute("data-ellipsoid", "moon");
    expect(viewer).toHaveAttribute("data-base-layer", "false");
    // Resium 1.28 falla con globe={false}: se deja el globo de Cesium, oculto.
    expect(screen.getByTestId("cesium-globe")).toHaveAttribute("data-show", "false");
  });

  it("shows the NASA and USGS attribution next to the real tileset, not next to the fallback", () => {
    vi.stubEnv("NEXT_PUBLIC_CESIUM_ION_TOKEN", "tok");
    vi.stubEnv("NEXT_PUBLIC_CESIUM_MOON_ASSET_ID", "123");
    const { unmount } = render(<Globe />);
    expect(screen.getByText(/NASA and the USGS Astrogeology Science Center/)).toBeInTheDocument();
    unmount();
    vi.stubEnv("NEXT_PUBLIC_CESIUM_ION_TOKEN", "");
    render(<Globe />);
    expect(screen.queryByText(/USGS Astrogeology/)).not.toBeInTheDocument();
  });
});
