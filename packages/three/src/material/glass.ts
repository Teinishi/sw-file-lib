import * as THREE from "three";
import type { Color } from "@sw-file-lib/core/color";
import { CREATE, ATTACH, colorVec3Transformer, UniformController } from "./uniformController";

const SKY_COLOR_UP = { r: 0, g: 61, b: 182 } as const;
const SKY_COLOR_DOWN = { r: 139, g: 210, b: 207 } as const;

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

/** Uniforms used by the glass material. */
export interface GlassUniforms {
  /** The color of the reflection of the sky when looking up. */
  skyColorUp: Color;
  /**  The color of the reflection of the sky when looking down. */
  skyColorDown: Color;
}

/**
 * Manages shader uniforms for the glass material.
 *
 * This can be created using {@link createGlassUniforms} and attached to a material using {@link createGlassMaterial}.
 *
 * @example
 * ```ts
 * const glassUniforms: GlassUniformController = createGlassUniforms();
 *
 * glassUniforms.set("skyColorUp", { r: 0, g: 61, b: 182 });
 * glassUniforms.set("skyColorDown", { r: 139, g: 210, b: 207 });
 * ```
 */
export type GlassUniformController = UniformController<GlassUniforms>;

/**
 * Create the default uniforms used for glass materials.
 *
 * A glass material can be created using {@link createGlassMaterial}.
 *
 * The default uniforms are:
 * - `skyColorUp`: { r: 0, g: 61, b: 182 }
 * - `skyColorDown`: { r: 139, g: 210, b: 207 }
 *
 * @example
 * ```ts
 * const glassUniforms = createGlassUniforms({
 *  skyColorUp: { r: 0, g: 61, b: 182 },
 *  skyColorDown: { r: 139, g: 210, b: 207 }
 * });
 *
 * const glassMaterial = createGlassMaterial(glassUniforms);
 * ```
 */
export function createGlassUniforms(defaults: Partial<GlassUniforms> = {}): GlassUniformController {
  const controller = UniformController[CREATE]<GlassUniforms>({
    skyColorUp: colorVec3Transformer,
    skyColorDown: colorVec3Transformer,
  });
  controller.patch({
    skyColorUp: SKY_COLOR_UP,
    skyColorDown: SKY_COLOR_DOWN,
    ...defaults,
  });
  return controller;
}

/**
 * Create the default glass material used for materialIndex 1 groups.
 *
 * If you want to use custom uniforms, you can create them using {@link createGlassUniforms} and pass them to this function.
 *
 * You can override the material parameters by passing a `THREE.ShaderMaterialParameters` object as the second argument.
 *
 * @returns A new `THREE.ShaderMaterial` with the specified uniforms, or a default one if not provided.
 */
export function createGlassMaterial(
  uniforms?: GlassUniformController,
  materialParameters?: THREE.ShaderMaterialParameters,
): THREE.ShaderMaterial {
  uniforms ??= createGlassUniforms();

  const shaderUniforms: { [uniform: string]: THREE.IUniform<any> } = {};

  uniforms[ATTACH](shaderUniforms);

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
