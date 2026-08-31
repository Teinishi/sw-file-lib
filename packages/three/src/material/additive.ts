import * as THREE from "three";
import { WHITE, type Color } from "@sw-file-lib/core/color";
import {
  CREATE,
  ATTACH,
  boolTransformer,
  colorVec4Transformer,
  UniformController,
} from "./uniformController";

export interface AdditiveUniforms {
  overrideColorEnabled: boolean;
  overrideColor: Color;
}

export type AdditiveUniformStore = UniformController<AdditiveUniforms>;

export function createAdditiveUniforms(
  defaults: Partial<AdditiveUniforms> = {},
): AdditiveUniformStore {
  const controller = UniformController[CREATE]<AdditiveUniforms>({
    overrideColorEnabled: boolTransformer,
    overrideColor: colorVec4Transformer,
  });
  controller.patch({
    overrideColorEnabled: true,
    overrideColor: WHITE,
    ...defaults,
  });
  return controller;
}

/** Create the default additive material used for materialIndex 2 groups. */
export function createAdditiveMaterial(
  uniforms?: AdditiveUniformStore,
  materialParameters?: THREE.MeshBasicMaterialParameters,
) {
  uniforms ??= createAdditiveUniforms();

  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    ...materialParameters,
  });

  material.onBeforeCompile = (shader) => {
    uniforms[ATTACH](shader.uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
uniform vec4 overrideColor;
uniform int overrideColorEnabled;`,
      )
      .replace(
        "#include <color_vertex>",
        /* glsl */ `#include <color_vertex>
if (overrideColorEnabled == 1)
{
  vColor.r = pow(overrideColor.r, 2.2);
  vColor.g = pow(overrideColor.g, 2.2);
  vColor.b = pow(overrideColor.b, 2.2);
}`,
      );
  };

  return material;
}
