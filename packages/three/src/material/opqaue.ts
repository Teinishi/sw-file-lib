import * as THREE from "three";
import { WHITE, type Color } from "@sw-file-lib/core/color";
import { colorToUniform4, UniformStore, uniformValueToColor } from "./internal/uniformStore";

export interface OpaqueUniforms {
  overrideColorEnabled: boolean;
  overrideColor1: Color;
  overrideColor2: Color;
  overrideColor3: Color;
}

export class OpaqueUniformStore extends UniformStore {
  constructor(defaults: Partial<OpaqueUniforms> = {}) {
    super();
    this.patch({
      overrideColorEnabled: true,
      overrideColor1: WHITE,
      overrideColor2: WHITE,
      overrideColor3: WHITE,
      ...defaults,
    });
  }

  patch(patch: Partial<OpaqueUniforms>) {
    if (patch.overrideColorEnabled !== undefined) {
      this.setOverrideColorEnabled(patch.overrideColorEnabled);
    }
    if (patch.overrideColor1 !== undefined) {
      this.setOverrideColor1(patch.overrideColor1);
    }
    if (patch.overrideColor2 !== undefined) {
      this.setOverrideColor2(patch.overrideColor2);
    }
    if (patch.overrideColor3 !== undefined) {
      this.setOverrideColor3(patch.overrideColor3);
    }
  }

  getOverrideColorEnabled(): boolean {
    return this.getValue("overrideColorEnabled") === 1;
  }

  setOverrideColorEnabled(enabled: boolean) {
    this.setValue("overrideColorEnabled", enabled ? 1 : 0);
  }

  getOverrideColor1(): Color | undefined {
    return uniformValueToColor(this.getValue("overrideColor1"));
  }

  setOverrideColor1(color: Color) {
    this.setValue("overrideColor1", colorToUniform4(color));
  }

  getOverrideColor2(): Color | undefined {
    return uniformValueToColor(this.getValue("overrideColor2"));
  }

  setOverrideColor2(color: Color) {
    this.setValue("overrideColor2", colorToUniform4(color));
  }

  getOverrideColor3(): Color | undefined {
    return uniformValueToColor(this.getValue("overrideColor3"));
  }

  setOverrideColor3(color: Color) {
    this.setValue("overrideColor3", colorToUniform4(color));
  }
}

/** Create the default opaque material used for materialIndex 0 groups. */
export function createOpaqueMaterial(
  uniforms?: OpaqueUniformStore,
  materialParameters?: THREE.MeshStandardMaterialParameters,
) {
  uniforms ??= new OpaqueUniformStore();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1.0,
    metalness: 0.0,
    ...materialParameters,
  });

  material.onBeforeCompile = (shader) => {
    uniforms._setShaderUniforms(shader.uniforms);

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
