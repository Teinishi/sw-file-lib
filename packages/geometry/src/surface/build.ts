import type { DeepReadonly } from "ts-essentials";
import type { Vec3, Mat3 } from "@sw-file-lib/core";
import { offsetPolygon3D } from "@sw-file-lib/internal-utils";
import {
  SURFACE_SHAPES,
  type BasicSurfaceShape,
  type BuildSurfaceGeometryOptions,
  type SurfaceData,
} from ".";
import { GeometryBuilder } from "..";

const SURFACE_EDGE_WIDTH = 0.003;
const SURFACE_EDGE_COLOR = { r: 25, g: 25, b: 25 };

const SURFACE_INNER_RINGS = Object.fromEntries(
  Object.entries(SURFACE_SHAPES).map(([key, value]) => [
    key,
    offsetPolygon3D(value, SURFACE_EDGE_WIDTH),
  ]),
) as Record<BasicSurfaceShape, Vec3[]>;

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
    const innerRing = SURFACE_INNER_RINGS[shape];

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
  const builder = new GeometryBuilder();

  for (const surface of surfaces) {
    const o = { ...options };
    if (surface.color) o.color = surface.color;
    const s = buildSurfaceGeometry(surface.shape, o);
    s.transform(stormToThreeMat3(surface.matrix), stormToThreeVec3(surface.position));
    builder.merge(s);
  }

  return builder;
}

function stormToThreeMat3(m: Readonly<Mat3>): Mat3 {
  return [m[0], m[1], -m[2], m[3], m[4], -m[5], -m[6], -m[7], m[8]];
}

function stormToThreeVec3(v: Readonly<Vec3>): Vec3 {
  return {
    x: 0.25 * v.x,
    y: 0.25 * v.y,
    z: -0.25 * v.z,
  };
}
