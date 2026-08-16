import * as THREE from "three";
import {
  applyUniformPatch,
  createAdditiveMaterial,
  createDefaultGlassUniforms,
  createDefaultOpaqueUniforms,
  createGlassMaterial,
  createOpaqueMaterial,
  createPhysMaterial,
  createUniformStore,
  type SwUniformPatch,
  type SwUniformStore,
} from ".";

/** Material families used by Stormworks render and physics mesh helpers. */
export type SwMaterialKind = "opaque" | "glass" | "additive" | "phys";

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
  /** Uniforms used by the physics mesh material. */
  phys: SwUniformStore;
}

/** Materials and their uniform stores used by Stormworks object creation helpers. */
export interface SwMaterialSet {
  /** Material used for shader id `0` submeshes. */
  opaque: THREE.MeshStandardMaterial;
  /** Material used for shader id `1` submeshes. */
  glass: THREE.ShaderMaterial;
  /** Material used for shader id `2` submeshes. */
  additive: THREE.MeshBasicMaterial;
  /** Material used for meshes created from `phys` files. */
  phys: THREE.MeshLambertMaterial;
  /** Uniform stores attached to this material set. */
  uniforms: SwUniformStores;
}

/** Options used when creating the default Stormworks material set. */
export interface CreateSwMaterialsOptions {
  /** Initial uniforms applied after each material family's defaults are created. */
  uniforms?: SwUniforms;
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
    phys: createPhysMaterial(uniformStores.phys),
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
  const phys = createUniformStore();

  applyUniformPatch(opaque, uniforms.opaque);
  applyUniformPatch(glass, uniforms.glass);
  applyUniformPatch(additive, uniforms.additive);
  applyUniformPatch(phys, uniforms.phys);

  return { opaque, glass, additive, phys };
}

/** Apply material-family uniform patches to an existing Stormworks material set. */
export function applySwUniforms(materials: SwMaterialSet, uniforms: SwUniforms = {}): void {
  applyUniformPatch(materials.uniforms.opaque, uniforms.opaque);
  applyUniformPatch(materials.uniforms.glass, uniforms.glass);
  applyUniformPatch(materials.uniforms.additive, uniforms.additive);
  applyUniformPatch(materials.uniforms.phys, uniforms.phys);
}

/**
 * Enable or disable wireframe rendering on materials that support it.
 *
 * The target can be either a Three.js object tree or an iterable of materials.
 * Materials without a `wireframe` property are ignored.
 */
export function setSwWireframe(
  objectOrMaterials: THREE.Object3D | Iterable<THREE.Material>,
  enabled: boolean,
): void {
  const materials =
    objectOrMaterials instanceof THREE.Object3D
      ? collectObjectMaterials(objectOrMaterials)
      : Array.from(objectOrMaterials);

  materials.forEach((material) => {
    if ("wireframe" in material) {
      material.wireframe = enabled;
    }
  });
}

function collectObjectMaterials(object: THREE.Object3D): THREE.Material[] {
  const materials = new Set<THREE.Material>();

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const material = child.material;
    if (Array.isArray(material)) {
      material.forEach((item) => materials.add(item));
    } else {
      materials.add(material);
    }
  });

  return Array.from(materials);
}
