import * as THREE from "three";
import { WHITE, type Color } from "@sw-file-lib/core/color";
import {
  CREATE,
  ATTACH,
  boolTransformer,
  colorVec4Transformer,
  UniformController,
} from "./uniformController";

export interface OpaqueUniforms {
  overrideColorEnabled: boolean;
  overrideColor1: Color;
  overrideColor2: Color;
  overrideColor3: Color;
}

export type OpaqueUniformStore = UniformController<OpaqueUniforms>;

export function createOpaqueUniforms(defaults: Partial<OpaqueUniforms> = {}): OpaqueUniformStore {
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

/** Create the default opaque material used for materialIndex 0 groups. */
export function createOpaqueMaterial(
  uniforms?: OpaqueUniformStore,
  materialParameters?: THREE.MeshStandardMaterialParameters,
) {
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
