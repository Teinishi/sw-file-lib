import * as THREE from "three";
import { parseColor, type ReadonlyColor } from "@sw-file-lib/core/color";
import {
  addVec3,
  mulMat3,
  mulMat3Vec3,
  Orientation,
  parseMat3,
  transposeMat3,
  vec3,
  type Mat3,
  type ReadonlyMat3,
  type ReadonlyVec3,
} from "@sw-file-lib/core/math";
import {
  buildSurfacesGeometry,
  GeometryBuilder,
  getSurfaceOrientation,
  isValidSurfaceOrientation,
  isValidSurfaceRotation,
  type BuildSurfaceGeometryOptions,
} from "@sw-file-lib/geometry";
import {
  ComponentDefinitionSchemas,
  VehicleSchemas,
  type ComponentDefinitionImmutable,
} from "@sw-file-lib/xml";
import { bufferGeometryFromBuilder, createOpaqueMaterial, createOpaqueUniforms } from "..";
import { stormworksToThreeMatrix4 } from "../internal";
import type { VehicleAssetResolver, createVehicleAssetResolver } from "./assetResolver"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { assembleMicrocontroller, assemblePaintableSign } from "./specialComponents";
import { createMaterialsForComponent } from "./utils";

/**
 * A flattened Stormworks surface with its final transform applied.
 *
 * Unlike the `<surface>` element in a component definition, `SurfaceData`
 * stores the surface position and orientation after the component hierarchy
 * has been resolved. This representation is used for operations that work
 * across multiple components, such as surface culling and vehicle mesh
 * generation.
 */
interface FlattenedSurfaceData {
  /** Vehicle-space position of the surface. */
  readonly position: ReadonlyVec3;
  /** Vehicle-space orientation matrix of the surface. */
  readonly matrix: ReadonlyMat3;
  /**
   * Stormworks surface shape ID.
   *
   * This is the same numeric value as the `shape` attribute of a
   * `<surface>` element.
   */
  readonly shape: number;
  /** Surface color. */
  readonly color?: ReadonlyColor;
}

/** The names of the mesh reference attributes in the component definition XML. */
export const MESH_ATTRIBUTE_NAMES = [
  "mesh_data_name",
  "mesh_0_name",
  "mesh_1_name",
  "mesh_2_name",
] as const;

/** The type for the mesh reference attributes in the component definition XML. */
export type MeshAttributeName = (typeof MESH_ATTRIBUTE_NAMES)[number];

/**
 * Assembles a single Stormworks vehicle body into Three.js objects.
 *
 * The assembler collects component geometry and meshes, then produces one
 * `THREE.Group` containing a culled surface mesh and any additional meshes.
 *
 * A single instance should be used for one vehicle body.
 *
 * The primary methods most applications should call are {@link appendComponent} and {@link build}.
 *
 * @example
 * ```ts
 * import * as THREE from "three";
 * import { parseVehicleXml } from "@sw-file-lib/xml";
 * import { createVehicleAssetResolver, VehicleBodyAssembler } from "@sw-file-lib/three";
 *
 * const assetResolver = createVehicleAssetResolver(
 *   (componentId) =>
 *     fetch(`/rom/data/definitions/${componentId}.xml`)
 *     .then((res) => res.ok ? res.text() : undefined),
 *   (meshPath) =>
 *     fetch(`/rom/${meshPath}`)
 *     .then((res) => res.ok ? res.arrayBuffer() : undefined)
 * );
 *
 * const vehicle = parseVehicleXml(text);
 * const vehicleGroup = new THREE.Group();
 *
 * for (const body of vehicle.bodies ?? []) {
 *   const assembler = new VehicleBodyAssembler(assetResolver);
 *   for (const component of body.components ?? []) {
 *     await assembler.appendComponent(component);
 *   }
 *
 *   const obj = assembler.build();
 *   vehicleGroup.add(obj);
 * }
 *
 * scene.add(vehicleGroup);
 * ```
 */
export class VehicleBodyAssembler {
  private assets: VehicleAssetResolver;
  private surfaces: FlattenedSurfaceData[] = [];
  private groups: THREE.Group[] = [];

  /**
   * Creates a new body assembler.
   *
   * @param assets Callbacks used to resolve component definitions and mesh assets.
   * Create a resolver with {@link createVehicleAssetResolver}, or make your own.
   * Wrapping them with a cache is recommended when loading from disk or over the network.
   */
  constructor(assets: VehicleAssetResolver) {
    this.assets = assets;
  }

  /**
   * Appends a component to the body.
   *
   * The component type is detected automatically, and the appropriate builder
   * is used internally. This is the primary method most applications should call.
   *
   * @param componentInstance The component instance from the vehicle body.
   * Represented by a `<c>` element in the vehicle XML.
   */
  async appendComponent(componentInstance: VehicleSchemas.ComponentImmutable): Promise<void> {
    const definition = await this.assets.resolveComponentDefinition(componentInstance.d);
    if (!definition) return;

    switch (definition.type) {
      case 28:
        return await this.appendPaintableSign(componentInstance, definition);
      case 37:
        return await this.appendMicrocontroller(componentInstance);
    }

    return await this.appendStandardComponent(componentInstance, definition);
  }

  /**
   * Appends surfaces and prebuilt objects to the body.
   *
   * This is a low-level API intended for custom or unsupported components.
   * All surfaces and objects must be provided in the component's local
   * coordinate system; they will be transformed into body space automatically.
   *
   * @param componentInstance The component instance from the vehicle body.
   * Represented by a `<c>` element in the vehicle XML.
   * @param surfaceDefinitions Surface definitions in local space.
   * @param objects Additional Three.js objects in local space.
   */
  appendRawComponent(
    componentInstance: VehicleSchemas.ComponentImmutable,
    surfaceDefinitions?: readonly ComponentDefinitionSchemas.SurfaceImmutable[] | undefined,
    objects?: readonly THREE.Object3D[] | undefined,
  ): void {
    const componentPosition = vec3(componentInstance.o?.vp);

    let componentMatrix: Mat3 = [0, 0, 1, -1, 0, 0, 0, -1, 0];
    if (componentInstance.o?.r !== undefined) {
      componentMatrix = parseMat3(componentInstance.o.r) ?? componentMatrix;
    }
    componentMatrix = transposeMat3(componentMatrix);
    if (componentInstance.t !== undefined) {
      if ((componentInstance.t & 1) !== 0)
        componentMatrix = mulMat3(componentMatrix, Orientation.FlipX.toMat3());
      if ((componentInstance.t & 2) !== 0)
        componentMatrix = mulMat3(componentMatrix, Orientation.FlipY.toMat3());
      if ((componentInstance.t & 4) !== 0)
        componentMatrix = mulMat3(componentMatrix, Orientation.FlipZ.toMat3());
    }

    const blockColor = parseColor(componentInstance.o?.bc ?? "x", { r: 255, g: 255, b: 255 });
    const surfaceColors =
      componentInstance.o?.sc
        ?.split(",")
        .slice(1)
        .map((c) => parseColor(c)) ?? [];

    for (const [index, surface] of (surfaceDefinitions ?? []).entries()) {
      const orientation = surface.orientation ?? 0;
      const rotation = surface.rotation ?? 0;
      const shape = surface.shape ?? 0;

      if (!isValidSurfaceOrientation(orientation)) continue;
      if (!isValidSurfaceRotation(rotation)) continue;

      const localPosition = vec3(surface.position);
      const position = addVec3(
        componentMatrix ? mulMat3Vec3(componentMatrix, localPosition) : localPosition,
        componentPosition,
      );

      let matrix = getSurfaceOrientation(orientation, rotation).toMat3();
      if (componentMatrix) matrix = mulMat3(componentMatrix, matrix);

      this.surfaces.push({
        position,
        matrix,
        shape,
        color: surfaceColors[index] ?? blockColor,
      });
    }

    if (objects && objects.length > 0) {
      const group = new THREE.Group();
      for (const meshObject of objects) {
        group.add(meshObject);
      }
      group.matrixAutoUpdate = false;
      group.matrix.copy(stormworksToThreeMatrix4(componentMatrix, componentPosition, 0.25));
      this.groups.push(group);
    }
  }

  /**
   * Appends a standard component using its component definition.
   *
   * This resolves surface definitions and any required mesh assets, transforms
   * them into world space, and adds them to the current body.
   *
   * Most users should prefer {@link appendComponent}, which performs type
   * detection automatically.
   *
   * @param componentInstance The component instance from the vehicle body.
   * Represented by a `<c>` element in the vehicle XML.
   * @param definition The component definition for the component instance.
   * @param meshesToExclude Optional list of mesh attributes to ignore.
   */
  async appendStandardComponent(
    componentInstance: VehicleSchemas.ComponentImmutable,
    definition?: ComponentDefinitionImmutable,
    meshesToExclude?: readonly MeshAttributeName[],
  ): Promise<void> {
    const { materialArr } = createMaterialsForComponent(componentInstance);

    const meshes: THREE.Mesh[] = [];

    for (const meshAttributeName of MESH_ATTRIBUTE_NAMES) {
      if (meshesToExclude?.includes(meshAttributeName) || !definition?.[meshAttributeName]) {
        continue;
      }
      const geometry = await this.assets.resolveMesh(definition[meshAttributeName]);
      if (!geometry) continue;
      meshes.push(new THREE.Mesh(geometry, materialArr));
    }

    this.appendRawComponent(componentInstance, definition?.surfaces, meshes);
  }

  /**
   * Appends a paintable sign component.
   *
   * Paintable signs generate their geometry dynamically from the component
   * properties and do not use a predefined mesh asset.
   *
   * @param componentInstance The component instance from the vehicle body.
   * Represented by a `<c>` element in the vehicle XML.
   * @param definition The component definition for the component instance.
   */
  async appendPaintableSign(
    componentInstance: VehicleSchemas.ComponentImmutable,
    definition: ComponentDefinitionImmutable,
  ): Promise<void> {
    const result = await assemblePaintableSign(componentInstance, definition);
    if (!result) return;
    this.appendRawComponent(componentInstance, result.surfaces, result.objects);
  }

  /**
   * Appends a microcontroller component.
   *
   * Microcontrollers have variable dimensions and therefore generate their
   * surfaces and meshes procedurally instead of using a fixed definition.
   *
   * @param componentInstance The component instance from the vehicle body.
   * Represented by a `<c>` element in the vehicle XML.
   */
  async appendMicrocontroller(componentInstance: VehicleSchemas.ComponentImmutable): Promise<void> {
    const result = await assembleMicrocontroller(componentInstance, this.assets);
    if (!result) return;
    this.appendRawComponent(componentInstance, result.surfaces, result.objects);
  }

  /**
   * Builds the merged surface mesh for this body using {@link GeometryBuilder}.
   *
   * Surface culling is performed before constructing geometry unless explicitly disabled by the options.
   * The returned geometry does not include any additional meshes.
   *
   * @see {@link build} for the complete object including additional meshes.
   */
  buildSurfaceMesh(options?: BuildSurfaceGeometryOptions): GeometryBuilder {
    return buildSurfacesGeometry(this.surfaces, options);
  }

  /**
   * Builds the final Three.js object representing this vehicle body.
   *
   * The returned group contains the merged surface mesh together with every
   * additional mesh appended during assembly.
   *
   * @returns A complete Three.js group for the body.
   */
  build(surfaceOptions?: BuildSurfaceGeometryOptions): THREE.Group {
    const group = new THREE.Group();

    const surfaceGeometry = bufferGeometryFromBuilder(this.buildSurfaceMesh(surfaceOptions));
    const surfaceMaterial = createOpaqueMaterial(
      createOpaqueUniforms({
        overrideColorEnabled: false,
      }),
    );
    const surfaceMesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
    group.add(surfaceMesh);

    for (const childGroup of this.groups) {
      group.add(childGroup);
    }
    return group;
  }
}
