import { Cartesian3, CustomShader, CustomShaderMode, LightingModel, UniformType } from "cesium";

import type { Vec3 } from "./lighting";

// El tileset de Cesium Moon trae el sombreado ya "horneado" (unlit) y no responde a scene.light.
// Para ver el día y la noche se oscurece cada fragmento según el ángulo con el Sol, aproximando la
// normal por la dirección radial (esfera lunar). El relieve local no proyecta sombra: ver PR.
const NIGHT_LEVEL = 0.06;
const TERMINATOR_SOFTNESS = 0.03; // ~1.7° de transición

export function createDayNightShader() {
  return new CustomShader({
    mode: CustomShaderMode.MODIFY_MATERIAL,
    lightingModel: LightingModel.UNLIT,
    uniforms: { u_sunDir: { type: UniformType.VEC3, value: new Cartesian3(1, 0, 0) } },
    fragmentShaderText: `
      void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
        vec3 up = normalize(fsInput.attributes.positionWC);
        float lit = smoothstep(-${TERMINATOR_SOFTNESS.toFixed(3)}, ${TERMINATOR_SOFTNESS.toFixed(3)}, dot(up, u_sunDir));
        material.diffuse *= mix(${NIGHT_LEVEL.toFixed(3)}, 1.0, lit);
      }`,
  });
}

/** Dirección unitaria al Sol (MOON_ME), tal como la entrega el motor. */
export function setSunDirection(shader: CustomShader, sun: Vec3) {
  shader.setUniform("u_sunDir", new Cartesian3(sun.x, sun.y, sun.z));
}
