import * as THREE from "three";
import { parseColor } from "@sw-file-lib/core/color";
import {
  type Mat3,
  addVec3,
  mulMat3,
  mulMat3Vec3,
  parseMat3,
  vec3,
  transposeMat3,
  Orientation,
} from "@sw-file-lib/core/math";
import {
  buildSurfacesGeometry,
  GeometryBuilder,
  getSurfaceOrientation,
  isValidSurfaceOrientation,
  isValidSurfaceRotation,
  type BuildSurfaceGeometryOptions,
  type SurfaceData,
} from "@sw-file-lib/geometry";
import type {
  ComponentDefinitionSchemas,
  VehicleImmutable,
  VehicleSchemas,
} from "@sw-file-lib/xml";
import {
  bufferGeometryFromBuilder,
  createOpaqueMaterial,
  createUniformStore,
  stormworksToThreeMatrix4,
} from "..";

export type MeshFactory = (
  component: VehicleSchemas.ComponentImmutable,
) =>
  | Record<string, THREE.Object3D>
  | undefined
  | Promise<Record<string, THREE.Object3D> | undefined>;

export type ComponentAssemblerResult = {
  readonly surfaces?: readonly ComponentDefinitionSchemas.SurfaceImmutable[];
  readonly objects?: Readonly<Record<PropertyKey, THREE.Object3D>>;
};

export type ComponentAssembler = (
  component: VehicleSchemas.ComponentImmutable,
  bodyIndex: number,
  componentIndex: number,
) => ComponentAssemblerResult | undefined | Promise<ComponentAssemblerResult | undefined>;

export interface AssembleVehicleOptions {
  readonly componentAssembler: ComponentAssembler;
  readonly surfaceOptions?: BuildSurfaceGeometryOptions;
}

export interface VehicleRenderGroup {
  bodyId: number | undefined;
  surfaceBuilder: GeometryBuilder;
  object: THREE.Group;
}

export async function assembleVehicleGeometry(
  vehicle: VehicleImmutable,
  options: AssembleVehicleOptions,
): Promise<VehicleRenderGroup[]> {
  const surfaceMaterial = createOpaqueMaterial(
    createUniformStore({ overrideColor: { type: "int", value: 0 } }),
  );

  const result: VehicleRenderGroup[] = [];

  for (const [bodyIndex, body] of (vehicle.bodies ?? []).entries()) {
    const bodyGroup = new THREE.Group();

    const surfaces: SurfaceData[] = [];

    for (const [componentIndex, component] of (body.components ?? []).entries()) {
      const assemblerResult = await options.componentAssembler(
        component,
        bodyIndex,
        componentIndex,
      );
      if (!assemblerResult) continue;

      const componentPosition = vec3(component.o?.vp);

      let componentMatrix: Mat3 = [0, 0, 1, -1, 0, 0, 0, -1, 0];
      if (component.o?.r !== undefined) {
        componentMatrix = parseMat3(component.o.r) ?? componentMatrix;
      }
      componentMatrix = transposeMat3(componentMatrix);
      if (component.t !== undefined) {
        if ((component.t & 1) !== 0)
          componentMatrix = mulMat3(componentMatrix, Orientation.FlipX.toMat3());
        if ((component.t & 2) !== 0)
          componentMatrix = mulMat3(componentMatrix, Orientation.FlipY.toMat3());
        if ((component.t & 4) !== 0)
          componentMatrix = mulMat3(componentMatrix, Orientation.FlipZ.toMat3());
      }

      const blockColor = parseColor(component.o?.bc ?? "x", { r: 255, g: 255, b: 255 });
      const surfaceColors =
        component.o?.sc
          ?.split(",")
          .slice(1)
          .map((c) => parseColor(c)) ?? [];

      for (const [index, surface] of (assemblerResult.surfaces ?? []).entries()) {
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

        surfaces.push({
          position,
          matrix,
          shape,
          color: surfaceColors[index] ?? blockColor,
        });
      }

      if (assemblerResult.objects && Object.keys(assemblerResult.objects).length > 0) {
        const componentGroup = new THREE.Group();
        for (const meshObject of Object.values(assemblerResult.objects)) {
          componentGroup.add(meshObject);
        }
        componentGroup.matrixAutoUpdate = false;
        componentGroup.matrix.copy(
          stormworksToThreeMatrix4(componentMatrix, componentPosition, 0.25),
        );
        bodyGroup.add(componentGroup);
      }
    }

    const surfaceBuilder = buildSurfacesGeometry(surfaces, options.surfaceOptions);
    const surfaceGeometry = bufferGeometryFromBuilder(surfaceBuilder);
    const surfaceMesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
    bodyGroup.add(surfaceMesh);

    result.push({
      bodyId: body.unique_id,
      surfaceBuilder: surfaceBuilder,
      object: bodyGroup,
    });
  }

  return result;
}
