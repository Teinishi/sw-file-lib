import type { DeepReadonly } from "ts-essentials";
import {
  addVec3,
  eqVec3,
  mulVec3,
  subVec3,
  type Mat3,
  type Vec3,
} from "@sw-file-lib/internal-utils";
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

  for (const [index, surface] of Object.entries(surfaces)) {
    const normal = getMatrixAxis(surface.matrix, "x");
    const key = cullingMapKey(surface.position, normal);
    if (!cullingMap.has(key)) cullingMap.set(key, new Set());
    cullingMap.get(key)!.add(Number(index));
    //cullingMap.getOrInsertComputed(key, () => new Set()).add(Number(index));
  }

  for (const [id1s, data1] of Object.entries(surfaces)) {
    const id1 = Number(id1s);
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

/*export function buildBasicBlockGeometry(
  blocks: DeepReadonly<BasicBlock[]>,
  options?: BuildBasicBlockGeometryOptions,
) {
  // surface を連番IDで管理
  const surfaceMap: Map<
    number,
    { position: Vec3; matrix: Mat3; surface: Surface; isFlipped: boolean }
  > = new Map();

  // ブロックに対する surface のIDリスト
  const blockSurfaceIds: Map<number, number[]> = new Map();

  // カリング用に surface の位置と法線をキーとする Map
  const cullingMap: Map<string, Set<number>> | undefined =
    options?.culling === false ? undefined : new Map();

  const getCullingMapKey = (pos: Readonly<Vec3>, normal: Readonly<Vec3>) =>
    `${pos.x},${pos.y},${pos.z}:${normal.x},${normal.y},${normal.z}`;

  // カリングによって消える surface のID
  const removeSurfaces: Set<number> = new Set();

  let idCounter = 0;
  blocks.forEach((block, blockIndex) => {
    const blockPos = block.position;
    const blockTransform = block.transform;

    const surfaceIds = [];

    const surfaces = BLOCK_SURFACE_DEFINITIONS[block.type];
    for (const surface of surfaces) {
      const localPos = Object.assign({ x: 0, y: 0, z: 0 }, surface.position);
      const position = addVec3(
        blockTransform ? mulMat3Vec3(blockTransform, localPos) : localPos,
        blockPos,
      );

      let matrix = getSurfaceOrientation(surface.orientation, surface.rotation ?? 0).toMat3();
      if (blockTransform) matrix = mulMat3(blockTransform, matrix);

      const normal = getMatrixAxis(matrix, "x");

      const id = idCounter++;
      surfaceMap.set(id, { position, matrix, surface, isFlipped: detMat3(matrix) < 0 });
      surfaceIds.push(id);

      if (cullingMap && surface.shape in SURFACE_EDGE_COVERAGE) {
        const key = getCullingMapKey(position, normal);
        cullingMap.getOrInsertComputed(key, () => new Set()).add(id);
      }
    }

    blockSurfaceIds.set(blockIndex, surfaceIds);
  });

  if (cullingMap) {
    // surface をカリング
    for (const [id1, data1] of surfaceMap) {
      if (removeSurfaces.has(id1)) continue;

      const coverage1 = SURFACE_EDGE_COVERAGE[data1.surface.shape];
      if (!coverage1) continue;

      const normal = getMatrixAxis(data1.matrix, "x");

      const adjacentPosition = addVec3(data1.position, normal);
      const adjacentKey = getCullingMapKey(adjacentPosition, mulVec3(normal, -1));
      const adjacentIds = cullingMap.get(adjacentKey);
      if (!adjacentIds) continue;

      const up = getMatrixAxis(data1.matrix, "y");
      const right = getMatrixAxis(data1.matrix, "z");
      const bottomLeft = subVec3(mulVec3(up, -1), right);

      for (const id2 of adjacentIds) {
        if (id2 < id1) continue;

        const data2 = surfaceMap.get(id2)!;
        const coverage2 = SURFACE_EDGE_COVERAGE[data2.surface.shape];
        if (!coverage2) continue;

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
        if (isACovered) removeSurfaces.add(id1);
        if (isBCovered) removeSurfaces.add(id2);
      }
    }
  }

  const builder = new GeometryBuilder();

  for (const [id, data] of surfaceMap) {
    if (removeSurfaces.has(id)) continue;

    const s = buildSurfaceGeometry(data.surface.shape, options);
    s.transform(stormToThreeMat3(data.matrix), stormToThreeVec3(data.position));
    builder.merge(s);
  }

  return builder;
}*/
