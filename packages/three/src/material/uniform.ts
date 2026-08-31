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
