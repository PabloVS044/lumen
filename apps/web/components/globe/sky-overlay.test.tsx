import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Vec3 } from "./lighting";

const { R, scene, entities } = vi.hoisted(() => ({
  R: 1_737_400,
  scene: { light: undefined as unknown, requestRender: vi.fn() },
  entities: [] as Record<string, unknown>[],
}));

vi.mock("cesium", () => {
  class Cartesian3 {
    constructor(
      public x: number,
      public y: number,
      public z: number,
    ) {}
    static fromDegrees(lon: number, lat: number) {
      return { lon, lat, x: 0, y: 0, z: 0 };
    }
  }
  return {
    ArcType: { NONE: 0 },
    Cartesian2: class {},
    Cartesian3,
    DirectionalLight: class {
      constructor(public options: { direction: Vec3 }) {}
    },
    Ellipsoid: { MOON: { maximumRadius: R } },
    PolylineArrowMaterialProperty: class {
      constructor(public color: unknown) {}
    },
    Color: { fromCssColorString: (css: string) => ({ css }) },
  };
});

vi.mock("./moon-shader", () => ({ setSunDirection: vi.fn() }));

vi.mock("resium", () => ({
  useCesium: () => ({ scene }),
  Entity: (props: Record<string, unknown>) => {
    entities.push(props);
    return null;
  },
}));

import type { CatalogSite } from "@lumen/sdk";

import { setSunDirection } from "./moon-shader";

import { SkyOverlay } from "./sky-overlay";

const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
interface Found {
  position: { lat: number; lon: number };
  polyline: { positions: Vec3[]; material?: unknown; depthFailMaterial?: unknown };
}
const byId = (id: string) => entities.find((e) => e.id === id) as Found | undefined;
const site = { id: "s", name: "S", lat: -89, lon: 10 } as CatalogSite;

beforeEach(() => {
  scene.light = undefined;
  scene.requestRender.mockClear();
  vi.mocked(setSunDirection).mockClear();
  entities.length = 0;
});

describe("SkyOverlay", () => {
  it("points the scene light from the Sun towards the Moon and asks for a render", () => {
    render(<SkyOverlay sun={{ x: 1, y: 0, z: 0 }} />);
    expect((scene.light as { options: { direction: Vec3 } }).options.direction).toMatchObject({
      x: -1,
      y: -0,
      z: -0,
    });
    expect(scene.requestRender).toHaveBeenCalled();
  });

  it("also feeds the Sun direction to the tileset day/night shader", () => {
    const shader = { id: "shader" } as unknown as Parameters<typeof SkyOverlay>[0]["shader"];
    const sun = { x: 0, y: 1, z: 0 };
    render(<SkyOverlay shader={shader} sun={sun} />);
    expect(setSunDirection).toHaveBeenCalledWith(shader, sun);
  });

  it("does nothing to the light while there is no Sun vector", () => {
    render(<SkyOverlay />);
    expect(scene.light).toBeUndefined();
    expect(byId("terminator")).toBeUndefined();
  });

  it("draws the terminator 90 degrees from the Sun, slightly above the surface", () => {
    const sun = { x: 0.6, y: 0.8, z: 0 };
    render(<SkyOverlay sun={sun} />);
    const positions = byId("terminator")!.polyline.positions as Vec3[];
    expect(positions.length).toBeGreaterThan(100);
    for (const p of positions) {
      expect(Math.hypot(p.x, p.y, p.z)).toBeGreaterThan(R);
      expect(dot(p, sun)).toBeCloseTo(0, 3);
    }
  });

  it("marks the sub-solar and sub-Earth points", () => {
    render(<SkyOverlay sun={{ x: 0, y: 1, z: 0 }} earth={{ x: 0, y: 0, z: -1 }} />);
    expect(byId("sub-sun")!.position).toMatchObject({ lon: 90, lat: 0 });
    expect(byId("sub-earth")!.position.lat).toBeCloseTo(-90, 9);
  });

  it("draws the arrow to the Earth only for a selected site", () => {
    render(<SkyOverlay earth={{ x: 0, y: 0, z: 1 }} />);
    expect(byId("earth-arrow")).toBeUndefined();
    entities.length = 0;
    render(<SkyOverlay earth={{ x: 0, y: 0, z: 1 }} site={site} />);
    const [from, to] = byId("earth-arrow")!.polyline.positions as Vec3[];
    expect(to!.z - from!.z).toBeCloseTo(300_000, 6);
  });

  it("keeps the arrow visible when real relief is in front of it", () => {
    render(<SkyOverlay earth={{ x: 0, y: 0, z: 1 }} site={site} />);
    const arrow = byId("earth-arrow")!.polyline;
    expect(arrow.depthFailMaterial).toBeDefined();
    expect(arrow.depthFailMaterial).not.toBe(arrow.material);
  });
});
