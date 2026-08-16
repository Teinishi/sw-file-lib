import * as THREE from "three";

/** A supported runtime value that can be assigned to shader uniforms. */
export type SwUniformValue =
  | { type: "int"; value: number }
  | { type: "float"; value: number }
  | { type: "vec2"; value: [number, number] | THREE.Vector2 }
  | { type: "vec3"; value: [number, number, number] | THREE.Vector3 | THREE.Color }
  | { type: "vec4"; value: [number, number, number, number] | THREE.Vector4 }
  | { type: "color"; value: string | number | THREE.Color };

/** A named collection of uniform values to apply to a material family. */
export type SwUniformPatch = Record<string, SwUniformValue>;

/** Mutable Three.js uniform references used by viewer-owned materials. */
export type SwUniformStore = Record<string, THREE.IUniform>;

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
  vec3 skyColor = mix(skyColorDown, skyColorUp, angleFactor);

  gl_FragColor = vec4(skyColor * reflectionFactor * 0.823, 0.0);
}
`;

/** Create mutable Three.js uniforms from typed viewer uniform values. */
export function createUniformStore(defaults: SwUniformPatch = {}): SwUniformStore {
  const store: SwUniformStore = {};

  applyUniformPatch(store, defaults);

  return store;
}

/** Apply typed uniform values to an existing uniform store. */
export function applyUniformPatch(store: SwUniformStore, patch: SwUniformPatch = {}): void {
  Object.entries(patch).forEach(([name, uniform]) => {
    const value = createUniformRuntimeValue(uniform);
    if (store[name]) {
      store[name].value = value;
    } else {
      store[name] = { value };
    }
  });
}

/** Create the default uniform values used by opaque mesh materials. */
export function createDefaultOpaqueUniforms(): SwUniformPatch {
  return {
    overrideColor1: { type: "vec4", value: [1.0, 1.0, 1.0, 1.0] },
    overrideColor2: { type: "vec4", value: [1.0, 1.0, 1.0, 1.0] },
    overrideColor3: { type: "vec4", value: [1.0, 1.0, 1.0, 1.0] },
    overrideColor: { type: "int", value: 1 },
  };
}

/** Create the default uniform values used by glass mesh materials. */
export function createDefaultGlassUniforms(): SwUniformPatch {
  return {
    skyColorUp: {
      type: "vec3",
      value: SKY_COLOR_UP,
    },
    skyColorDown: {
      type: "vec3",
      value: SKY_COLOR_DOWN,
    },
  };
}

/** Create the default opaque material used for shaderId 0 submeshes. */
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

/** Create the default glass material used for shaderId 1 submeshes. */
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

/** Create the default additive material used for shaderId 2 submeshes. */
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

/** Create the material used for phys files. */
export function createPhysMaterial(
  uniforms = createUniformStore(),
  materialParameters?: THREE.MeshLambertMaterialParameters,
) {
  const material = new THREE.MeshLambertMaterial({
    color: 0xa0a0a0,
    ...materialParameters,
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
  };

  return material;
}

function createUniformRuntimeValue(
  uniform: SwUniformValue,
): number | THREE.Vector2 | THREE.Vector3 | THREE.Vector4 | THREE.Color {
  if (uniform.type === "int" || uniform.type === "float") {
    return uniform.value;
  }

  if (uniform.type === "vec2") {
    if (uniform.value instanceof THREE.Vector2) {
      return uniform.value.clone();
    }

    return new THREE.Vector2(...uniform.value);
  }

  if (uniform.type === "vec3") {
    if (uniform.value instanceof THREE.Vector3 || uniform.value instanceof THREE.Color) {
      return uniform.value.clone();
    }

    return new THREE.Vector3(...uniform.value);
  }

  if (uniform.type === "color") {
    if (uniform.value instanceof THREE.Color) {
      return uniform.value.clone();
    }

    return new THREE.Color(uniform.value);
  }

  if (uniform.value instanceof THREE.Vector4) {
    return uniform.value.clone();
  }

  return new THREE.Vector4(...uniform.value);
}
