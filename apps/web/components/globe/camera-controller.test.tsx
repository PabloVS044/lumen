import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { camera } = vi.hoisted(() => ({
  camera: { setView: vi.fn(), flyToBoundingSphere: vi.fn() },
}));

vi.mock("cesium", () => ({
  BoundingSphere: class {
    constructor(
      public center: unknown,
      public radius: number,
    ) {}
  },
  Cartesian3: {
    fromDegrees: (lon: number, lat: number, h: number) => ({ lon, lat, h }),
  },
  Ellipsoid: { MOON: { name: "moon" } },
  HeadingPitchRange: class {
    constructor(
      public heading: number,
      public pitch: number,
      public range: number,
    ) {}
  },
  Math: { toRadians: (d: number) => (d * Math.PI) / 180 },
}));
vi.mock("resium", () => ({ useCesium: () => ({ camera }) }));

import { CameraController } from "./camera-controller";

beforeEach(() => {
  camera.setView.mockClear();
  camera.flyToBoundingSphere.mockClear();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CameraController", () => {
  it("starts looking straight down at the south pole, from about two lunar radii", () => {
    render(<CameraController />);
    expect(camera.setView).toHaveBeenCalledTimes(1);
    const { destination, orientation } = camera.setView.mock.calls[0]![0];
    expect(destination.lat).toBe(-90);
    expect(destination.h).toBeGreaterThan(2_000_000);
    expect(orientation.pitch).toBeCloseTo(-Math.PI / 2, 12);
    expect(orientation.heading).toBe(0);
    expect(camera.flyToBoundingSphere).not.toHaveBeenCalled();
  });

  it("does not reset the camera on re-render", () => {
    const { rerender } = render(<CameraController />);
    rerender(<CameraController />);
    expect(camera.setView).toHaveBeenCalledTimes(1);
  });

  it("flies to a site when one is selected, looking down from a few hundred km", () => {
    const { rerender } = render(<CameraController />);
    rerender(<CameraController target={{ lat: -89.45, lon: -137.31 }} />);
    expect(camera.flyToBoundingSphere).toHaveBeenCalledTimes(1);
    const [sphere, options] = camera.flyToBoundingSphere.mock.calls[0]!;
    expect(sphere.center).toMatchObject({ lat: -89.45, lon: -137.31 });
    expect(options.duration).toBeGreaterThan(0);
    expect(options.offset.pitch).toBeCloseTo(-Math.PI / 2, 12);
    expect(options.offset.range).toBeLessThan(1_000_000);
  });

  it("flies again only when the target changes", () => {
    const { rerender } = render(<CameraController target={{ lat: 1, lon: 2 }} />);
    rerender(<CameraController target={{ lat: 1, lon: 2 }} />);
    expect(camera.flyToBoundingSphere).toHaveBeenCalledTimes(1);
    rerender(<CameraController target={{ lat: 3, lon: 4 }} />);
    expect(camera.flyToBoundingSphere).toHaveBeenCalledTimes(2);
  });

  it("jumps without animation when the user prefers reduced motion", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: /reduce/.test(q) }));
    render(<CameraController target={{ lat: 1, lon: 2 }} />);
    expect(camera.flyToBoundingSphere.mock.calls[0]![1].duration).toBe(0);
  });
});
