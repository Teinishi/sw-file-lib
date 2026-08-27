import type { StrictOmit } from "ts-essentials";
import { maxVec3, minVec3, vec3 } from "@sw-file-lib/core/math";
import type { SwVec3, ComponentDefinition } from "..";
import type { Surface, Voxel } from "../schemas/ComponentDefinition";

function forVoxels(
  from: Readonly<SwVec3>,
  to: Readonly<SwVec3>,
  callback: (position: Readonly<SwVec3>) => void,
) {
  const a = vec3(from);
  const b = vec3(to);

  const { x: x1, y: y1, z: z1 } = minVec3(a, b);
  const { x: x2, y: y2, z: z2 } = maxVec3(a, b);

  for (let z = z1; z <= z2; z++) {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        callback({ x, y, z });
      }
    }
  }
}

function forCuboidSurfaces(
  from: Readonly<SwVec3>,
  to: Readonly<SwVec3>,
  callback: (from: Readonly<SwVec3>, to: Readonly<SwVec3>, orientation: number) => void,
) {
  const a = vec3(from);
  const b = vec3(to);
  const min = minVec3(a, b);
  const max = maxVec3(a, b);
  callback({ ...min, x: max.x }, max, 0);
  callback(min, { ...max, x: min.x }, 1);
  callback({ ...min, y: max.y }, max, 2);
  callback(min, { ...max, y: min.y }, 3);
  callback({ ...min, z: max.z }, max, 4);
  callback(min, { ...max, z: min.z }, 5);
}

export function createCuboidSurfaces(
  from: Readonly<SwVec3>,
  to: Readonly<SwVec3>,
  orientations: number[],
  options?: Readonly<StrictOmit<Surface, "position" | "orientation">>,
): Surface[] {
  const surfaces: Surface[] = [];

  forCuboidSurfaces(from, to, (a, b, orientation) => {
    if (!orientations.includes(orientation)) return;
    forVoxels(a, b, (position) => {
      surfaces.push({ ...options, position, orientation });
    });
  });

  return surfaces;
}

export function createVoxels(
  from: Readonly<SwVec3>,
  to: Readonly<SwVec3>,
  options?: Readonly<StrictOmit<Voxel, "position">>,
): Voxel[] {
  const voxels: Voxel[] = [];

  forVoxels(from, to, (position) => {
    voxels.push({ ...options, position });
  });

  return voxels;
}

export function calculateVoxelBounds(
  data: ComponentDefinition,
  dest: ("voxel" | "voxel_physics")[],
  filter?: (voxel: Voxel) => boolean,
) {
  const arr = (filter ? data.voxels?.filter(filter) : data.voxels) ?? [];

  let min, max;

  for (const { position } of arr) {
    const x = position?.x ?? 0;
    const y = position?.y ?? 0;
    const z = position?.z ?? 0;

    if (min === undefined) min = { x, y, z };
    else {
      min.x = Math.min(min.x, x);
      min.y = Math.min(min.y, y);
      min.z = Math.min(min.z, z);
    }
    if (max === undefined) max = { x, y, z };
    else {
      max.x = Math.max(max.x, x);
      max.y = Math.max(max.y, y);
      max.z = Math.max(max.z, z);
    }
  }

  if (min === undefined || max === undefined) return;

  if (dest.includes("voxel")) {
    data.voxel_min = { ...min };
    data.voxel_max = { ...max };
  }
  if (dest.includes("voxel_physics")) {
    data.voxel_physics_min = { ...min };
    data.voxel_physics_max = { ...max };
  }
}
