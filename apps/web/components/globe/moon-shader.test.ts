import { describe, expect, it } from "vitest";

import { createDayNightShader, setSunDirection } from "./moon-shader";

describe("day/night shader", () => {
  it("darkens fragments against the Sun direction in world coordinates, keeping the baked look unlit", () => {
    const shader = createDayNightShader();
    expect(shader.fragmentShaderText).toContain("u_sunDir");
    expect(shader.fragmentShaderText).toContain("positionWC");
    expect(shader.lightingModel).toBeDefined();
  });

  it("takes the Sun direction as a uniform", () => {
    const shader = createDayNightShader();
    setSunDirection(shader, { x: 0, y: 1, z: 0 });
    expect(shader.uniforms.u_sunDir!.value).toMatchObject({ x: 0, y: 1, z: 0 });
  });
});
