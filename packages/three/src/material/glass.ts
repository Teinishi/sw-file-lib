import * as THREE from "three";
import type { Color } from "@sw-file-lib/core/color";
import { colorToUniform3, UniformStore, uniformValueToColor } from "./internal/uniformStore";

const SKY_COLOR_UP = new THREE.Color(0.0, 61.0 / 255.0, 182.0 / 255.0);
const SKY_COLOR_DOWN = new THREE.Color(139.0 / 255.0, 210.0 / 255.0, 207.0 / 255.0);

const GLASS_VERTEX_SHADER = /* glsl */ `
out vec3 vWorldPosition;
out vec3 vWorldNormal;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const GLASS_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 skyColorUp;
uniform vec3 skyColorDown;

in vec3 vWorldPosition;
in vec3 vWorldNormal;

void main() {
  vec3 cameraToFragment = normalize(vWorldPosition - cameraPosition);
  vec3 reflectedDir = reflect(cameraToFragment, normalize(vWorldNormal));

  float reflectionFactor = max(0.0, -dot(vWorldNormal, cameraToFragment));
  reflectionFactor = pow(1.0 - reflectionFactor, 5.0);
  reflectionFactor = clamp(reflectionFactor, 0.0, 1.0);

  float angleFactor = reflectedDir.y * 0.5 + 0.5;
  vec3 skyColor = mix(skyColorDown.rgb, skyColorUp.rgb, angleFactor);

  gl_FragColor = vec4(skyColor * reflectionFactor * 0.823, 0.0);
}
`;

export interface GlassUniforms {
  skyColorUp: Color;
  skyColorDown: Color;
}

export class GlassUniformStore extends UniformStore {
  constructor(defaults: Partial<GlassUniforms> = {}) {
    super();
    this.patch({
      skyColorUp: SKY_COLOR_UP,
      skyColorDown: SKY_COLOR_DOWN,
      ...defaults,
    });
  }

  patch(patch: Partial<GlassUniforms>) {
    if (patch.skyColorUp !== undefined) {
      this.setSkyColorUp(patch.skyColorUp);
    }
    if (patch.skyColorDown !== undefined) {
      this.setSkyColorDown(patch.skyColorDown);
    }
  }

  getSkyColorUp(): Color | undefined {
    return uniformValueToColor(this.getValue("skyColorUp"));
  }

  setSkyColorUp(color: Color) {
    this.setValue("skyColorUp", colorToUniform3(color));
  }

  getSkyColorDown(): Color | undefined {
    return uniformValueToColor(this.getValue("skyColorDown"));
  }

  setSkyColorDown(color: Color) {
    this.setValue("skyColorDown", colorToUniform3(color));
  }
}

/** Create the default glass material used for materialIndex 1 groups. */
export function createGlassMaterial(
  uniforms?: GlassUniformStore,
  materialParameters?: THREE.ShaderMaterialParameters,
) {
  uniforms ??= new GlassUniformStore();

  const shaderUniforms: { [uniform: string]: THREE.IUniform<any> } = {};

  uniforms._setShaderUniforms(shaderUniforms);

  return new THREE.ShaderMaterial({
    vertexShader: GLASS_VERTEX_SHADER,
    fragmentShader: GLASS_FRAGMENT_SHADER,
    uniforms: shaderUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendEquation: THREE.AddEquation,
    ...materialParameters,
  });
}
