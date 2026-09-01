import * as THREE from "three";
import { WHITE, type Color } from "@sw-file-lib/core/color";
import {
  CREATE,
  ATTACH,
  boolTransformer,
  colorVec4Transformer,
  UniformController,
} from "./uniformController";

/** Uniforms used by the additive material. */
export interface AdditiveUniforms {
  /**
   * Whether to override the vertex colors with a single color.
   *
   * When enabled, the `overrideColor` uniform is used instead of the vertex colors.
   */
  overrideColorEnabled: boolean;
  /** The color to use when `overrideColorEnabled` is true. */
  overrideColor: Color;
}

/**
 * Manages shader uniforms for the additive material.
 *
 * This can be created using {@link createAdditiveUniforms} and attached to a material using {@link createAdditiveMaterial}.
 *
 * @example
 * ```ts
 * const additiveUniforms: AdditiveUniformController = createAdditiveUniforms();
 *
 * additiveUniforms.set("overrideColorEnabled", true);
 * additiveUniforms.set("overrideColor", { r: 255, g: 0, b: 0 });
 * ```
 */
export type AdditiveUniformController = UniformController<AdditiveUniforms>;

/**
 * Create the default uniforms used for additive materials.
 *
 * An additive material can be created using {@link createAdditiveMaterial}.
 *
 * The default uniforms are:
 * - `overrideColorEnabled`: true
 * - `overrideColor`: white
 *
 * @example
 * ```ts
 * const additiveUniforms = createAdditiveUniforms({
 *  overrideColorEnabled: false
 * });
 *
 * const additiveMaterial = createAdditiveMaterial(additiveUniforms);
 * ```
 */
export function createAdditiveUniforms(
  defaults: Partial<AdditiveUniforms> = {},
): AdditiveUniformController {
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

/**
 * Create an additive material used for materialIndex 2 groups.
 *
 * If you want to use custom uniforms, you can create them using {@link createAdditiveUniforms} and pass them to this function.
 *
 * You can override the material parameters by passing a `THREE.MeshBasicMaterialParameters` object as the second argument.
 *
 * @returns A new `THREE.MeshBasicMaterial` with the specified uniforms, or a default one if not provided.
 */
export function createAdditiveMaterial(
  uniforms?: AdditiveUniformController | undefined | null,
  materialParameters?: THREE.MeshBasicMaterialParameters,
): THREE.MeshBasicMaterial {
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
