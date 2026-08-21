import type { DeepReadonly } from "ts-essentials";
import type { Vec3, Mat3 } from "@sw-file-lib/core";
import { addVec3, eqVec3, mulVec3, subVec3 } from "@sw-file-lib/internal-utils";
import { SURFACE_EDGE_COVERAGE, surfaceEdgeCoverageExists, type SurfaceData } from ".";
import { compareCoverage } from "../internal/surface";

function getMatrixAxis(m: Readonly<Mat3>, axis: "x" | "y" | "z"): Vec3 {
  const i = "xyz".indexOf(axis);
  return { x: m[i]!, y: m[i + 3]!, z: m[i + 6]! };
}

function cullingMapKey(pos: Readonly<Vec3>, normal: Readonly<Vec3>) {
  return `${pos.x},${pos.y},${pos.z}:${normal.x},${normal.y},${normal.z}`;
}

export function cullSurfaces(surfaces: DeepReadonly<SurfaceData[]>) {
  // カリング用に surface の位置と法線をキーとする Map
  const cullingMap: Map<string, Set<number>> = new Map();

  // カリングによって消える surface の index
  const culledSurfaces: Set<number> = new Set();

  for (const [index, surface] of surfaces.entries()) {
    const normal = getMatrixAxis(surface.matrix, "x");
    const key = cullingMapKey(surface.position, normal);
    if (!cullingMap.has(key)) cullingMap.set(key, new Set());
    cullingMap.get(key)!.add(index);
  }

  for (const [id1, data1] of surfaces.entries()) {
    if (culledSurfaces.has(id1)) continue;

    const shape1 = data1.shape;
    if (!surfaceEdgeCoverageExists(shape1)) continue;
    const coverage1 = SURFACE_EDGE_COVERAGE[shape1];

    const normal = getMatrixAxis(data1.matrix, "x");

    const adjacentPosition = addVec3(data1.position, normal);
    const adjacentKey = cullingMapKey(adjacentPosition, mulVec3(normal, -1));
    const adjacentIds = cullingMap.get(adjacentKey);
    if (adjacentIds === undefined) continue;

    const up = getMatrixAxis(data1.matrix, "y");
    const right = getMatrixAxis(data1.matrix, "z");
    const bottomLeft = subVec3(mulVec3(up, -1), right);

    for (const id2 of adjacentIds) {
      if (id2 < id1) continue;

      const data2 = surfaces[id2]!;
      const shape2 = data2.shape;
      if (!surfaceEdgeCoverageExists(shape2)) continue;
      const coverage2 = SURFACE_EDGE_COVERAGE[shape2];

      const up2 = getMatrixAxis(data2.matrix, "y");
      const right2 = getMatrixAxis(data2.matrix, "z");
      const flip = data1.isFlipped === data2.isFlipped;

      let start;
      if (eqVec3(subVec3(mulVec3(up2, -1), right2), bottomLeft)) {
        start = 0;
      } else if (eqVec3(addVec3(mulVec3(up2, -1), right2), bottomLeft)) {
        start = 1;
      } else if (eqVec3(addVec3(up2, right2), bottomLeft)) {
        start = 2;
      } else if (eqVec3(subVec3(up2, right2), bottomLeft)) {
        start = 3;
      } else {
        continue;
      }

      const { isACovered, isBCovered } = compareCoverage(coverage1, coverage2, start, flip);
      if (isACovered) culledSurfaces.add(id1);
      if (isBCovered) culledSurfaces.add(id2);
    }
  }

  return culledSurfaces;
}
