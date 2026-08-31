import * as THREE from "three";
import { createUniformStore, type SwUniformPatch } from "./uniform";

/** Create the default additive material used for materialIndex 2 groups. */
export function createAdditiveMaterial(
  uniforms = createUniformStore(createDefaultAdditiveUniforms()),
  materialParameters?: THREE.MeshBasicMaterialParameters,
) {
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    ...materialParameters,
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
uniform vec4 overrideColor;
uniform int enableOverrideColor;`,
      )
      .replace(
        "#include <color_vertex>",
        /* glsl */ `#include <color_vertex>
if (enableOverrideColor == 1)
{
  vColor.r = pow(overrideColor.r, 2.2);
  vColor.g = pow(overrideColor.g, 2.2);
  vColor.b = pow(overrideColor.b, 2.2);
}`,
      );
  };

  return material;
}

export function createDefaultAdditiveUniforms(): SwUniformPatch {
  return {
    overrideColor: { type: "vec4", value: [1.0, 1.0, 1.0, 1.0] },
    enableOverrideColor: { type: "int", value: 1 },
  };
}
