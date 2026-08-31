import * as THREE from "three";
import { createUniformStore, type SwUniformPatch } from "./uniform";

/** Create the default opaque material used for materialIndex 0 groups. */
export function createOpaqueMaterial(
  uniforms = createUniformStore(createDefaultOpaqueUniforms()),
  materialParameters?: THREE.MeshStandardMaterialParameters,
) {
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1.0,
    metalness: 0.0,
    ...materialParameters,
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
uniform vec4 blockColor1;
uniform vec4 blockColor2;
uniform vec4 blockColor3;
uniform int overrideColor;`,
      )
      .replace(
        "#include <color_vertex>",
        /* glsl */ `#ifdef USE_COLOR
vColor.xyz = color.xyz;
if (overrideColor == 1) {
  if (distance(color.rgb, vec3(1.0, 0.494, 0.0)) < 0.01) vColor = blockColor1;
  else if (distance(color.rgb, vec3(0.608, 0.494, 0.0)) < 0.01) vColor = blockColor2;
  else if (distance(color.rgb, vec3(0.216, 0.494, 0.0)) < 0.01) vColor = blockColor3;
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

/** Create the default uniform values used by opaque mesh materials. */
export function createDefaultOpaqueUniforms(): SwUniformPatch {
  return {
    blockColor1: { type: "vec4", value: [1.0, 1.0, 1.0, 1.0] },
    blockColor2: { type: "vec4", value: [1.0, 1.0, 1.0, 1.0] },
    blockColor3: { type: "vec4", value: [1.0, 1.0, 1.0, 1.0] },
    overrideColor: { type: "int", value: 1 },
  };
}
