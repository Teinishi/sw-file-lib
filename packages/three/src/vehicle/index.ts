import * as THREE from "three";
import { parseColor } from "@sw-file-lib/core/color";
import {
  addVec3,
  detMat3,
  mulMat3,
  mulMat3Vec3,
  parseMat3,
  vec3,
  transposeMat3,
  type Mat3,
  Orientation,
} from "@sw-file-lib/core/math";
import {
  buildSurfacesGeometry,
  GeometryBuilder,
  getSurfaceOrientation,
  isValidSurfaceOrientation,
  isValidSurfaceRotation,
  isValidSurfaceShape,
  type BuildSurfaceGeometryOptions,
  type SurfaceData,
} from "@sw-file-lib/geometry";
import type { ComponentDefinitionImmutable, VehicleImmutable } from "@sw-file-lib/xml";
import { bufferGeometryFromBuilder, createOpaqueMaterial, createUniformStore } from "..";

export interface ResolvedComponent {
  definition: ComponentDefinitionImmutable;
}

export type ComponentResolver = (name: string) => Promise<ResolvedComponent | undefined>;

export interface AssembleVehicleOptions {
  /**
   * A function that resolves component definitions by name.
   * If a component cannot be resolved, it will be skipped.
   * The result of this function is cached for each unique component name, so it will only be called once per unique name.
   */
  readonly resolve: ComponentResolver;

  readonly surfaceOptions?: BuildSurfaceGeometryOptions;
}

export interface VehicleRenderGroup {
  bodyId: number | undefined;
  builder: GeometryBuilder;
  object: THREE.Group;
}

export async function assembleVehicleGeometry(
  vehicle: VehicleImmutable,
  options: AssembleVehicleOptions,
): Promise<VehicleRenderGroup[]> {
  const surfaceMaterial = createOpaqueMaterial(
    createUniformStore({ overrideColor: { type: "int", value: 0 } }),
  );

  const componentCache: Record<string, ResolvedComponent | undefined> = {};

  const result: VehicleRenderGroup[] = [];

  for (const body of vehicle.bodies ?? []) {
    const group = new THREE.Group();

    const surfaces: SurfaceData[] = [];

    for (const component of body.components ?? []) {
      const d = component.d ?? "01_block";

      let data: ResolvedComponent | undefined;
      if (d in componentCache) {
        data = componentCache[d];
      } else {
        data = await options.resolve(d);
        componentCache[d] = data;
      }

      if (data === undefined) continue;

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

      for (const [index, surface] of (data.definition.surfaces ?? []).entries()) {
        const orientation = surface.orientation ?? 0;
        const rotation = surface.rotation ?? 0;
        const shape = surface.shape ?? 0;

        if (!isValidSurfaceOrientation(orientation)) continue;
        if (!isValidSurfaceRotation(rotation)) continue;
        if (!isValidSurfaceShape(shape)) continue;

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
          isFlipped: detMat3(matrix) < 0,
          shape,
          color: surfaceColors[index] ?? blockColor,
        });
      }
    }

    const builder = buildSurfacesGeometry(surfaces, options.surfaceOptions);
    const geometry = bufferGeometryFromBuilder(builder);
    const mesh = new THREE.Mesh(geometry, surfaceMaterial);
    group.add(mesh);

    result.push({
      bodyId: body.unique_id,
      builder,
      object: group,
    });
  }

  return result;
}
