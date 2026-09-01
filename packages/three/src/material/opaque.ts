import * as THREE from "three";
import { WHITE, type Color } from "@sw-file-lib/core/color";
import {
  CREATE,
  ATTACH,
  boolTransformer,
  colorVec4Transformer,
  UniformController,
} from "./uniformController";

/** Uniforms used by the opaque material. */
export interface OpaqueUniforms {
  /**
   * Whether to override the vertex colors.
   *
   * When enabled, the `overrideColor1`, `overrideColor2`, and `overrideColor3` uniforms are used instead of certain vertex colors.
   */
  overrideColorEnabled: boolean;
  /** The color to override vertex colors that is close to `(255, 126, 0)` with when `overrideColorEnabled` is true. */
  overrideColor1: Color;
  /** The color to override vertex colors that is close to `(155, 126, 0)` with when `overrideColorEnabled` is true. */
  overrideColor2: Color;
  /** The color to override vertex colors that is close to `(55, 126, 0)` with when `overrideColorEnabled` is true. */
  overrideColor3: Color;
}

/**
 * Manages shader uniforms for the opaque material.
 *
 * This can be created using {@link createOpaqueUniforms} and attached to a material using {@link createOpaqueMaterial}.
 *
 * @example
 * ```ts
 * const opaqueUniforms: OpaqueUniformController = createOpaqueUniforms();
 *
 * opaqueUniforms.set("overrideColorEnabled", true);
 * opaqueUniforms.set("overrideColor1", { r: 255, g: 0, b: 0 });
 * opaqueUniforms.set("overrideColor2", { r: 0, g: 255, b: 0 });
 * opaqueUniforms.set("overrideColor3", { r: 0, g: 0, b: 255 });
 * ```
 */
export type OpaqueUniformController = UniformController<OpaqueUniforms>;

/**
 * Create the default uniforms used for opaque materials.
 *
 * An opaque material can be created using {@link createOpaqueMaterial}.
 *
 * The default uniforms are:
 * - `overrideColorEnabled`: true
 * - `overrideColor1`: white
 * - `overrideColor2`: white
 * - `overrideColor3`: white
 *
 * @example
 * ```ts
 * const opaqueUniforms = createOpaqueUniforms({
 *  overrideColorEnabled: false
 * });
 *
 * const opaqueMaterial = createOpaqueMaterial(opaqueUniforms);
 * ```
 */
export function createOpaqueUniforms(
  defaults: Partial<OpaqueUniforms> = {},
): OpaqueUniformController {
  const controller = UniformController[CREATE]<OpaqueUniforms>({
    overrideColorEnabled: boolTransformer,
    overrideColor1: colorVec4Transformer,
    overrideColor2: colorVec4Transformer,
    overrideColor3: colorVec4Transformer,
  });
  controller.patch({
    overrideColorEnabled: true,
    overrideColor1: WHITE,
    overrideColor2: WHITE,
    overrideColor3: WHITE,
    ...defaults,
  });
  return controller;
}

/**
 * Create the default opaque material used for materialIndex 0 groups.
 *
 * If you want to use custom uniforms, you can create them using {@link createOpaqueUniforms} and pass them to this function.
 *
 * You can override the material parameters by passing a `THREE.MeshStandardMaterialParameters` object as the second argument.
 *
 * @returns A new `THREE.MeshStandardMaterial` with the specified uniforms, or a default one if not provided.
 */
export function createOpaqueMaterial(
  uniforms?: OpaqueUniformController,
  materialParameters?: THREE.MeshStandardMaterialParameters,
): THREE.MeshStandardMaterial {
  uniforms ??= createOpaqueUniforms();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1.0,
    metalness: 0.0,
    ...materialParameters,
  });

  material.onBeforeCompile = (shader) => {
    uniforms[ATTACH](shader.uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
uniform vec4 overrideColor1;
uniform vec4 overrideColor2;
uniform vec4 overrideColor3;
uniform int overrideColorEnabled;`,
      )
      .replace(
        "#include <color_vertex>",
        /* glsl */ `#ifdef USE_COLOR
vColor.xyz = color.xyz;
if (overrideColorEnabled == 1) {
  if (distance(color.rgb, vec3(1.0, 0.494, 0.0)) < 0.01) vColor = overrideColor1;
  else if (distance(color.rgb, vec3(0.608, 0.494, 0.0)) < 0.01) vColor = overrideColor2;
  else if (distance(color.rgb, vec3(0.216, 0.494, 0.0)) < 0.01) vColor = overrideColor3;
}
vColor.rgb = pow(vColor.rgb, vec3(2.2));
#endif`,
      );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <aomap_fragment>",
      /* glsl */ `#include <aomap_fragment>
float dist = length(vViewPosition);
float incidence = max(dot(geometryNormal, geometryViewDir), 0.0);
float distanceFactor = 0.05 * (1.0 / max(0.01, dist) - 1.0 / 100.0);
reflectedLight.directDiffuse += diffuseColor.rgb * incidence * distanceFactor * 16.0;`,
    );
  };

  return material;
}
