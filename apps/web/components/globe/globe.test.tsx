import { TransportProvider } from "@connectrpc/connect-query";
import { createMockTransport, mockCatalog } from "@lumen/sdk/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
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
  Cesium3DTileset: ({ customShader }: { customShader?: unknown }) => (
    <div data-testid="tileset" data-shader={customShader ? "on" : "off"} />
  ),
  Entity: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="fallback-sphere">{children}</div>
  ),
  EllipsoidGraphics: () => null,
  Globe: ({ show }: { show?: boolean }) => (
    <div data-testid="cesium-globe" data-show={String(show)} />
  ),
}));

vi.mock("./camera-controller", () => ({
  CameraController: ({ target }: { target?: { lat: number; lon: number } }) => (
    <div data-testid="camera" data-target={target ? `${target.lat},${target.lon}` : ""} />
  ),
}));

vi.mock("./site-markers", () => ({
  SiteMarkers: ({
    sites,
    selectedId,
    selectedStatus,
  }: {
    sites: unknown[];
    selectedId?: string;
    selectedStatus?: { sun: boolean; earth: boolean };
  }) => (
    <div
      data-testid="markers"
      data-count={sites.length}
      data-selected={selectedId}
      data-status={selectedStatus ? JSON.stringify(selectedStatus) : ""}
    />
  ),
}));

vi.mock("./moon-shader", () => ({ createDayNightShader: () => ({ id: "day-night" }) }));

vi.mock("./sky-overlay", () => ({
  SkyOverlay: ({ sun, site }: { sun?: unknown; site?: { id: string } }) => (
    <div data-testid="sky" data-has-sun={String(Boolean(sun))} data-site={site?.id} />
  ),
}));

import { useScenarioStore } from "@/stores/scenario-store";

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
  useScenarioStore.setState({ currentTime: null });
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

  it("creates the viewer with the lunar ellipsoid, no imagery and the default globe hidden", () => {
    renderGlobe();
    const viewer = screen.getByTestId("viewer");
    expect(viewer).toHaveAttribute("data-ellipsoid", "moon");
    expect(viewer).toHaveAttribute("data-base-layer", "false");
    // Resium 1.28 falla con globe={false}: se deja el globo de Cesium, oculto.
    expect(screen.getByTestId("cesium-globe")).toHaveAttribute("data-show", "false");
  });

  it("shows the NASA and USGS attribution next to the real tileset, not next to the fallback", () => {
    vi.stubEnv("NEXT_PUBLIC_CESIUM_ION_TOKEN", "tok");
    vi.stubEnv("NEXT_PUBLIC_CESIUM_MOON_ASSET_ID", "123");
    const { unmount } = renderGlobe();
    expect(screen.getByText(/NASA and the USGS Astrogeology Science Center/)).toBeInTheDocument();
    unmount();
    vi.stubEnv("NEXT_PUBLIC_CESIUM_ION_TOKEN", "");
    renderGlobe();
    expect(screen.queryByText(/USGS Astrogeology/)).not.toBeInTheDocument();
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

  it("passes the Sun vector and the selected site to the sky overlay once the time is set", async () => {
    useScenarioStore.setState({ currentTime: "2027-01-15T06:30:00Z" });
    renderGlobe({ selectedSiteId: mockCatalog[1]!.id });
    expect(screen.getByTestId("sky")).toHaveAttribute("data-has-sun", "false");
    await waitFor(() => expect(screen.getByTestId("sky")).toHaveAttribute("data-has-sun", "true"));
    expect(screen.getByTestId("sky")).toHaveAttribute("data-site", mockCatalog[1]!.id);
  });

  it("warns in text when GetState fails and keeps the globe", async () => {
    useScenarioStore.setState({ currentTime: "2027-01-15T06:30:00Z" });
    const failing = {
      unary: () => Promise.reject(new Error("engine down")),
      stream: () => Promise.reject(new Error("engine down")),
    } as unknown as ReturnType<typeof createMockTransport>;
    renderGlobe({}, failing);
    const alerts = await screen.findAllByRole("alert");
    expect(alerts.some((a) => /Sun and Earth/i.test(a.textContent ?? ""))).toBe(true);
    expect(screen.getByTestId("viewer")).toBeInTheDocument();
  });

  it("applies the day/night shader to the tileset only once the Sun is known", async () => {
    vi.stubEnv("NEXT_PUBLIC_CESIUM_ION_TOKEN", "tok");
    vi.stubEnv("NEXT_PUBLIC_CESIUM_MOON_ASSET_ID", "123");
    useScenarioStore.setState({ currentTime: "2027-01-15T06:30:00Z" });
    renderGlobe();
    expect(screen.getByTestId("tileset")).toHaveAttribute("data-shader", "off");
    await waitFor(() => expect(screen.getByTestId("tileset")).toHaveAttribute("data-shader", "on"));
  });

  it("sends the camera to the selected site", async () => {
    renderGlobe({ selectedSiteId: mockCatalog[1]!.id });
    await waitFor(() =>
      expect(screen.getByTestId("camera")).toHaveAttribute(
        "data-target",
        `${mockCatalog[1]!.lat},${mockCatalog[1]!.lon}`,
      ),
    );
  });

  it("forwards the selected site's visibility status to its marker", async () => {
    renderGlobe({
      selectedSiteId: mockCatalog[0]!.id,
      selectedStatus: { sun: true, earth: false },
    });
    const markers = await screen.findByTestId("markers");
    expect(JSON.parse(markers.dataset.status!)).toEqual({ sun: true, earth: false });
  });

  it("warns that the globe shading is approximate once the tileset is shaded by the Sun", async () => {
    vi.stubEnv("NEXT_PUBLIC_CESIUM_ION_TOKEN", "tok");
    vi.stubEnv("NEXT_PUBLIC_CESIUM_MOON_ASSET_ID", "123");
    renderGlobe();
    expect(screen.queryByText(/shading is approximate/i)).not.toBeInTheDocument();
    useScenarioStore.setState({ currentTime: "2027-01-15T06:30:00Z" });
    expect(
      await screen.findByText(/shading is approximate and ignores terrain relief/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/real visibility is in the side panel/i)).toBeInTheDocument();
  });
});
