import * as THREE from "three";
import {
  applyUniformPatch,
  createAdditiveMaterial,
  createDefaultGlassUniforms,
  createDefaultOpaqueUniforms,
  createGlassMaterial,
  createOpaqueMaterial,
  createUniformStore,
  type SwUniformPatch,
  type SwUniformStore,
} from ".";

/** Material families for Stormworks mesh. */
export type SwMaterialKind = "opaque" | "glass" | "additive";

/** Uniform patches keyed by Stormworks material family. */
export type SwUniforms = Partial<Record<SwMaterialKind, SwUniformPatch>>;

/** Mutable Three.js uniform stores owned by a Stormworks material set. */
export interface SwUniformStores {
  /** Uniforms used by the opaque render material. */
  opaque: SwUniformStore;
  /** Uniforms used by the glass render material. */
  glass: SwUniformStore;
  /** Uniforms used by the additive render material. */
  additive: SwUniformStore;
}

/** Materials and their uniform stores used by Stormworks object creation helpers. */
export interface SwMaterialSet {
  /** Material used for shader id `0` groups. */
  opaque: THREE.MeshStandardMaterial;
  /** Material used for shader id `1` groups. */
  glass: THREE.ShaderMaterial;
  /** Material used for shader id `2` groups. */
  additive: THREE.MeshBasicMaterial;
  /** Uniform stores attached to this material set. */
  uniforms: SwUniformStores;
}

/** Options used when creating the default Stormworks material set. */
export interface CreateSwMaterialsOptions {
  /** Initial uniforms applied after each material family's defaults are created. */
  readonly uniforms?: Readonly<SwUniforms>;
}

/**
 * Create the default materials used by Stormworks object helpers.
 *
 * A new material set has independent uniform stores, making it suitable for
 * object-local color and shader state. Share the returned set only when objects
 * should intentionally share uniform updates.
 */
export function createSwMaterials(options: CreateSwMaterialsOptions = {}): SwMaterialSet {
  const uniformStores = createSwUniformStores(options.uniforms);

  return {
    opaque: createOpaqueMaterial(uniformStores.opaque),
    glass: createGlassMaterial(uniformStores.glass),
    additive: createAdditiveMaterial(uniformStores.additive),
    uniforms: uniformStores,
  };
}

/**
 * Create mutable uniform stores for each Stormworks material family.
 *
 * Default opaque and glass uniforms are included before the optional patch is
 * applied.
 */
export function createSwUniformStores(uniforms: SwUniforms = {}): SwUniformStores {
  const opaque = createUniformStore(createDefaultOpaqueUniforms());
  const glass = createUniformStore(createDefaultGlassUniforms());
  const additive = createUniformStore();

  applyUniformPatch(opaque, uniforms.opaque);
  applyUniformPatch(glass, uniforms.glass);
  applyUniformPatch(additive, uniforms.additive);

  return { opaque, glass, additive };
}

/** Apply material-family uniform patches to an existing Stormworks material set. */
export function applySwUniforms(materials: SwMaterialSet, uniforms: SwUniforms = {}): void {
  applyUniformPatch(materials.uniforms.opaque, uniforms.opaque);
  applyUniformPatch(materials.uniforms.glass, uniforms.glass);
  applyUniformPatch(materials.uniforms.additive, uniforms.additive);
}
