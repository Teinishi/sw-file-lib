import type { DeepReadonly } from "ts-essentials";
import {
  addVec3,
  crossVec3,
  dotVec3,
  mulVec3,
  normalizeVec3,
  subVec3,
  type Vec3,
} from "@sw-file-lib/core/math";
import {
  cullSurfaces,
  SURFACE_SHAPES,
  type BasicSurfaceShape,
  type BuildSurfaceGeometryOptions,
  type SurfaceData,
} from ".";
import { GeometryBuilder } from "..";

const SURFACE_EDGE_WIDTH = 0.003;
const SURFACE_EDGE_COLOR = { r: 25, g: 25, b: 25 };

const innerRingCache: Record<BasicSurfaceShape, Vec3[]> = {} as Record<BasicSurfaceShape, Vec3[]>;

function getInnerRing(shape: BasicSurfaceShape) {
  if (!innerRingCache[shape]) {
    innerRingCache[shape] = offsetPolygon3D(SURFACE_SHAPES[shape], SURFACE_EDGE_WIDTH);
  }
  return innerRingCache[shape];
}

function offsetPolygon3D(vertices: DeepReadonly<Vec3[]>, offset: number): Vec3[] {
  if (vertices.length < 3) return [...vertices];

  const v0 = vertices[0]!;
  const v1 = vertices[1]!;
  const v2 = vertices[2]!;

  const normal = normalizeVec3(crossVec3(subVec3(v1, v0), subVec3(v2, v0)));

  const result: Vec3[] = [];

  for (let i = 0; i < vertices.length; i++) {
    const prev = vertices.at(i - 1)!;
    const curr = vertices[i]!;
    const next = vertices[(i + 1) % vertices.length]!;

    const prevDir = normalizeVec3(subVec3(curr, prev));
    const nextDir = normalizeVec3(subVec3(next, curr));

    // 面内で内側を向く法線
    const prevInward = normalizeVec3(crossVec3(normal, prevDir));
    const nextInward = normalizeVec3(crossVec3(normal, nextDir));

    // 二等分方向
    const moveDir = normalizeVec3(addVec3(prevInward, nextInward));

    // オフセット距離補正
    const cos = dotVec3(moveDir, prevInward);

    result.push(addVec3(curr, mulVec3(moveDir, offset / cos)));
  }

  return result;
}

export function buildSurfaceGeometry(
  shape: BasicSurfaceShape,
  options?: DeepReadonly<BuildSurfaceGeometryOptions>,
) {
  const hollow = options?.hollow ?? false;
  const edge = hollow || (options?.edge ?? false);
  const color = options?.color;

  const outerRing = SURFACE_SHAPES[shape];
  const n = outerRing.length;

  const builder = new GeometryBuilder();
  if (n < 3) return builder;

  if (edge) {
    const innerRing = getInnerRing(shape);

    for (let i = 0; i < n; i++) {
      const v0 = outerRing[i]!;
      const v1 = outerRing[(i + 1) % n]!;
      const v2 = innerRing[(i + 1) % n]!;
      const v3 = innerRing[i]!;
      builder.addFace([v0, v1, v2, v3], { color: SURFACE_EDGE_COLOR });
    }

    if (!hollow) {
      builder.addFace(innerRing, color);
    }
  } else {
    builder.addFace(outerRing, color);
  }

  return builder;
}

export function buildSurfacesGeometry(
  surfaces: DeepReadonly<SurfaceData[]>,
  options?: DeepReadonly<BuildSurfaceGeometryOptions>,
) {
  let culledSurfaces: Set<number> | undefined;
  if (options?.cull ?? true) {
    culledSurfaces = cullSurfaces(surfaces);
  }

  const builder = new GeometryBuilder();

  for (const [index, surface] of surfaces.entries()) {
    if (culledSurfaces?.has(index)) continue;

    const o = { ...options };
    if (surface.color) o.color = surface.color;
    const s = buildSurfaceGeometry(surface.shape, o);
    s.transform(surface.matrix, scaleStormworksPosition(surface.position));
    builder.merge(s);
  }

  return builder;
}

function scaleStormworksPosition(v: Readonly<Vec3>): Vec3 {
  return {
    x: 0.25 * v.x,
    y: 0.25 * v.y,
    z: 0.25 * v.z,
  };
}
