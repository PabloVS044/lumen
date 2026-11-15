import { TransportProvider } from "@connectrpc/connect-query";
import { createMockTransport, mockCatalog } from "@lumen/sdk/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
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
    globe?: boolean;
    ellipsoid?: { name: string };
  }) => (
    <div
      data-testid="viewer"
      data-ellipsoid={props.ellipsoid?.name}
      data-globe={String(props.globe)}
    >
      {children}
    </div>
  ),
  Cesium3DTileset: () => <div data-testid="tileset" />,
  Entity: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="fallback-sphere">{children}</div>
  ),
  EllipsoidGraphics: () => null,
}));

vi.mock("./site-markers", () => ({
  SiteMarkers: ({ sites, selectedId }: { sites: unknown[]; selectedId?: string }) => (
    <div data-testid="markers" data-count={sites.length} data-selected={selectedId} />
  ),
}));

import { Globe } from "./globe";

function renderGlobe(props: ComponentProps<typeof Globe> = {}, transport = createMockTransport()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <TransportProvider transport={transport}>
      <QueryClientProvider client={client}>
        <Globe {...props} />
      </QueryClientProvider>
    </TransportProvider>,
  );
}

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
    renderGlobe();
    expect(screen.getByRole("status")).toHaveTextContent(/token/i);
    expect(screen.getByTestId("fallback-sphere")).toBeInTheDocument();
    expect(screen.queryByTestId("tileset")).not.toBeInTheDocument();
  });

  it("falls back when the Moon asset id is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_CESIUM_ION_TOKEN", "tok");
    vi.stubEnv("NEXT_PUBLIC_CESIUM_MOON_ASSET_ID", "");
    renderGlobe();
    expect(screen.getByRole("status")).toHaveTextContent(/asset/i);
    expect(screen.queryByTestId("tileset")).not.toBeInTheDocument();
  });

  it("mounts the ion tileset and no banner when token and asset id are set", () => {
    vi.stubEnv("NEXT_PUBLIC_CESIUM_ION_TOKEN", "tok");
    vi.stubEnv("NEXT_PUBLIC_CESIUM_MOON_ASSET_ID", "123");
    renderGlobe();
    expect(screen.getByTestId("tileset")).toBeInTheDocument();
    expect(IonResource.fromAssetId).toHaveBeenCalledWith(123, { accessToken: "tok" });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByTestId("fallback-sphere")).not.toBeInTheDocument();
  });

  it("creates the viewer without the default globe, using the lunar ellipsoid", () => {
    renderGlobe();
    const viewer = screen.getByTestId("viewer");
    expect(viewer).toHaveAttribute("data-ellipsoid", "moon");
    expect(viewer).toHaveAttribute("data-globe", "false");
  });

  it("shows a marker layer with the catalog once ListSites answers", async () => {
    renderGlobe({ selectedSiteId: mockCatalog[0]!.id });
    const markers = await screen.findByTestId("markers");
    expect(markers).toHaveAttribute("data-count", String(mockCatalog.length));
    expect(markers).toHaveAttribute("data-selected", mockCatalog[0]!.id);
  });

  it("keeps the globe and warns in text when ListSites fails", async () => {
    const failing = {
      unary: () => Promise.reject(new Error("engine down")),
      stream: () => Promise.reject(new Error("engine down")),
    } as unknown as ReturnType<typeof createMockTransport>;
    renderGlobe({}, failing);
    expect(await screen.findByRole("alert")).toHaveTextContent(/catalog/i);
    expect(screen.getByTestId("viewer")).toBeInTheDocument();
    expect(screen.queryByTestId("markers")).not.toBeInTheDocument();
  });
});
