import * as THREE from "three";
import { WHITE, type Color } from "@sw-file-lib/core/color";
import { colorToUniform4, UniformStore, uniformValueToColor } from "./internal/uniformStore";

export interface AdditiveUniforms {
  overrideColorEnabled: boolean;
  overrideColor: Color;
}

export class AdditiveUniformStore extends UniformStore {
  constructor(defaults: Partial<AdditiveUniforms> = {}) {
    super();
    this.patch({
      overrideColorEnabled: true,
      overrideColor: WHITE,
      ...defaults,
    });
  }

  patch(patch: Partial<AdditiveUniforms>) {
    if (patch.overrideColor !== undefined) {
      this.setOverrideColor(patch.overrideColor);
    }
    if (patch.overrideColorEnabled !== undefined) {
      this.setOverrideColorEnabled(patch.overrideColorEnabled);
    }
  }

  getOverrideColorEnabled(): boolean {
    return this.getValue("overrideColorEnabled") === 1;
  }

  setOverrideColorEnabled(enabled: boolean) {
    this.setValue("overrideColorEnabled", enabled ? 1 : 0);
  }

  getOverrideColor(): Color | undefined {
    return uniformValueToColor(this.getValue("overrideColor"));
  }

  setOverrideColor(color: Color) {
    this.setValue("overrideColor", colorToUniform4(color));
  }
}

/** Create the default additive material used for materialIndex 2 groups. */
export function createAdditiveMaterial(
  uniforms?: AdditiveUniformStore,
  materialParameters?: THREE.MeshBasicMaterialParameters,
) {
  uniforms ??= new AdditiveUniformStore();

  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    ...materialParameters,
  });

  material.onBeforeCompile = (shader) => {
    uniforms._setShaderUniforms(shader.uniforms);

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
