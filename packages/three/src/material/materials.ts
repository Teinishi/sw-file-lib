import * as THREE from "three";
import {
  createAdditiveMaterial,
  createAdditiveUniforms,
  type AdditiveUniforms,
  type AdditiveUniformStore,
} from "./additive";
import {
  createGlassMaterial,
  createGlassUniforms,
  type GlassUniforms,
  type GlassUniformStore,
} from "./glass";
import {
  createOpaqueMaterial,
  createOpaqueUniforms,
  type OpaqueUniforms,
  type OpaqueUniformStore,
} from "./opaque";

/** Material families for Stormworks mesh. */
export type SwMaterialKind = "opaque" | "glass" | "additive";

/** Mutable Three.js uniform stores owned by a Stormworks material set. */
export interface SwUniformStores {
  /** Uniforms used by the opaque render material. */
  opaque: OpaqueUniformStore;
  /** Uniforms used by the glass render material. */
  glass: GlassUniformStore;
  /** Uniforms used by the additive render material. */
  additive: AdditiveUniformStore;
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
  readonly uniforms?: {
    opaque?: Partial<OpaqueUniforms>;
    glass?: Partial<GlassUniforms>;
    additive?: Partial<AdditiveUniforms>;
  };
}

/**
 * Create the default materials used by Stormworks object helpers.
 *
 * A new material set has independent uniform stores, making it suitable for
 * object-local color and shader state. Share the returned set only when objects
 * should intentionally share uniform updates.
 */
export function createSwMaterials(options: CreateSwMaterialsOptions = {}): SwMaterialSet {
  const opaqueUniforms = createOpaqueUniforms(options.uniforms?.opaque);
  const glassUniforms = createGlassUniforms(options.uniforms?.glass);
  const additiveUniforms = createAdditiveUniforms(options.uniforms?.additive);

  return {
    opaque: createOpaqueMaterial(opaqueUniforms),
    glass: createGlassMaterial(glassUniforms),
    additive: createAdditiveMaterial(additiveUniforms),
    uniforms: {
      opaque: opaqueUniforms,
      glass: glassUniforms,
      additive: additiveUniforms,
    },
  };
}
