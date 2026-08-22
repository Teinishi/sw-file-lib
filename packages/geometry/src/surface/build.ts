import type { DeepReadonly } from "ts-essentials";
import type { Vec3 } from "@sw-file-lib/core";
import { offsetPolygon3D } from "@sw-file-lib/internal-utils";
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
