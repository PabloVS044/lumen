import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { camera, scene, tileset } = vi.hoisted(() => {
  const camera = { setView: vi.fn(), frustum: { fov: 0 } };
  return {
    camera,
    scene: { requestRender: vi.fn() },
    tileset: { height: undefined as number | undefined, args: [] as unknown[][] },
  };
});

vi.mock("cesium/Build/Cesium/Widgets/widgets.css", () => ({}));
vi.mock("cesium", () => ({
  Cartesian3: { fromDegrees: (lon: number, lat: number, h: number) => ({ lon, lat, h }) },
  Ellipsoid: { MOON: { name: "moon" } },
  IonResource: { fromAssetId: () => Promise.resolve({}) },
  Math: { toRadians: (d: number) => (d * Math.PI) / 180 },
}));
vi.mock("resium", () => ({
  Viewer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Globe: () => null,
  Cesium3DTileset: ({ onReady }: { onReady?: () => void }) => {
    onReady?.();
    return null;
  },
  useCesium: () => ({ camera, scene }),
}));
vi.mock("@/components/globe/use-tileset-height", () => ({
  useTilesetHeight: (...args: unknown[]) => {
    tileset.args.push(args);
    return tileset.height;
  },
}));

import { GroundView } from "./ground-view";

const props = { lat: -89.9, lon: 10, observerHeightM: 2, heading: 90, fovDeg: 60 };

beforeEach(() => {
  camera.setView.mockClear();
  scene.requestRender.mockClear();
  tileset.height = undefined;
  tileset.args.length = 0;
  vi.stubEnv("NEXT_PUBLIC_CESIUM_ION_TOKEN", "tok");
  vi.stubEnv("NEXT_PUBLIC_CESIUM_MOON_ASSET_ID", "123");
});

describe("GroundView", () => {
  it("does not place the camera until the tileset's own height at the site is known", () => {
    render(<GroundView {...props} />);
    expect(camera.setView).not.toHaveBeenCalled();
  });

  it("puts the camera at the tileset height plus the observer height, never an engine height", () => {
    tileset.height = 1949.9;
    render(<GroundView {...props} />);
    const { destination, orientation } = camera.setView.mock.calls.at(-1)![0];
    expect(destination).toEqual({ lon: 10, lat: -89.9, h: 1949.9 + 2 });
    expect(orientation.heading).toBeCloseTo(Math.PI / 2, 12);
    expect(orientation.pitch).toBe(0);
    expect(camera.frustum.fov).toBeCloseTo(Math.PI / 3, 12);
    expect(scene.requestRender).toHaveBeenCalled();
  });

  it("samples the tileset at the site once the tileset is ready", () => {
    render(<GroundView {...props} />);
    expect(tileset.args.at(-1)).toEqual([scene, true, { lat: -89.9, lon: 10 }]);
  });

  it("re-aims without changing the height when only the heading changes", () => {
    tileset.height = 1949.9;
    const { rerender } = render(<GroundView {...props} />);
    rerender(<GroundView {...props} heading={200} />);
    const last = camera.setView.mock.calls.at(-1)![0];
    expect(last.destination.h).toBe(1951.9);
    expect(last.orientation.heading).toBeCloseTo((200 * Math.PI) / 180, 12);
  });
});
