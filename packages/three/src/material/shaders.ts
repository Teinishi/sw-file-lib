import * as THREE from "three";
import { createDefaultGlassUniforms, createDefaultOpaqueUniforms, createUniformStore } from ".";

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
  vec3 skyColor = mix(skyColorDown, skyColorUp, angleFactor);

  gl_FragColor = vec4(skyColor * reflectionFactor * 0.823, 0.0);
}
`;

/** Create the default opaque material used for shaderId 0 groups. */
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
uniform vec4 overrideColor1;
uniform vec4 overrideColor2;
uniform vec4 overrideColor3;
uniform int overrideColor;`,
      )
      .replace(
        "#include <color_vertex>",
        /* glsl */ `#ifdef USE_COLOR
vColor.xyz = color.xyz;
if (overrideColor == 1) {
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

/** Create the default glass material used for shaderId 1 groups. */
export function createGlassMaterial(
  uniforms = createUniformStore(createDefaultGlassUniforms()),
  materialParameters?: THREE.ShaderMaterialParameters,
) {
  return new THREE.ShaderMaterial({
    vertexShader: GLASS_VERTEX_SHADER,
    fragmentShader: GLASS_FRAGMENT_SHADER,
    uniforms: { ...uniforms },
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendEquation: THREE.AddEquation,
    ...materialParameters,
  });
}

/** Create the default additive material used for shaderId 2 groups. */
export function createAdditiveMaterial(
  uniforms = createUniformStore(),
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
  };

  return material;
}
