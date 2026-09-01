import * as THREE from "three";
import {
  createAdditiveMaterial,
  createAdditiveUniforms,
  type AdditiveUniforms,
  type AdditiveUniformController,
} from "./additive";
import {
  createGlassMaterial,
  createGlassUniforms,
  type GlassUniforms,
  type GlassUniformController,
} from "./glass";
import {
  createOpaqueMaterial,
  createOpaqueUniforms,
  type OpaqueUniforms,
  type OpaqueUniformController,
} from "./opaque";

/** Material families for Stormworks mesh. */
export type SwMaterialKind = "opaque" | "glass" | "additive";

/** Mutable Three.js uniform stores owned by a Stormworks material set. */
export interface SwUniformControllers {
  /** Uniforms used by the opaque render material. */
  opaque: OpaqueUniformController;
  /** Uniforms used by the glass render material. */
  glass: GlassUniformController;
  /** Uniforms used by the additive render material. */
  additive: AdditiveUniformController;
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
  uniforms: SwUniformControllers;
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
