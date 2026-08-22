import type { DeepReadonly } from "ts-essentials";
import {
  addVec3,
  eqVec3,
  modulo,
  mulVec3,
  subVec3,
  type Mat3,
  type Vec3,
} from "@sw-file-lib/core/math";
import {
  SURFACE_EDGE_COVERAGE,
  surfaceEdgeCoverageExists,
  type ShapeEdgeCoverage,
  type SurfaceData,
} from ".";

function getMatrixAxis(m: Readonly<Mat3>, axis: "x" | "y" | "z"): Vec3 {
  const i = "xyz".indexOf(axis);
  return { x: m[i]!, y: m[i + 3]!, z: m[i + 6]! };
}

function cullingMapKey(pos: Readonly<Vec3>, normal: Readonly<Vec3>) {
  return `${pos.x},${pos.y},${pos.z}:${normal.x},${normal.y},${normal.z}`;
}

/**
 * Return indices of surfaces that are fully hidden by adjacent compatible surfaces.
 *
 * This is useful before rendering or exporting generated component surfaces. It
 * only culls shapes with known edge coverage data.
 */
export function cullSurfaces(surfaces: DeepReadonly<SurfaceData[]>) {
  const cullingMap: Map<string, Set<number>> = new Map();

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

function compareCoverage(
  a: DeepReadonly<ShapeEdgeCoverage>,
  b: DeepReadonly<ShapeEdgeCoverage>,
  start: number = 0,
  flip: boolean = false,
) {
  let na = 0;
  let nb = 0;

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const k = 4 * i + j;

      na |= (a[i]![j]! ? 1 : 0) << k;

      if (flip) {
        nb |= (b[modulo(start - i - 1, 4)]![3 - j]! ? 1 : 0) << k;
      } else {
        nb |= (b[modulo(start + i, 4)]![j]! ? 1 : 0) << k;
      }
    }
  }

  return {
    isACovered: (na | nb) === nb,
    isBCovered: (na | nb) === na,
  };
}
