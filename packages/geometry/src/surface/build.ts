import {
  addVec3,
  crossVec3,
  dotVec3,
  mulVec3,
  normalizeVec3,
  subVec3,
  type Vec3,
} from "@sw-file-lib/core/math";
import { cullSurfaces, type BuildSurfaceGeometryOptions, type SurfaceData } from ".";
import { GeometryBuilder } from "..";
import { getSurfaceShape } from "./internal/shapes";

const SURFACE_EDGE_WIDTH = 0.003;
const SURFACE_EDGE_COLOR = { r: 25, g: 25, b: 25 };

const innerRingCache = {} as Record<number, Vec3[] | null>;

function getInnerRing(shape: number): Vec3[] | undefined {
  if (!(shape in innerRingCache)) {
    const s = getSurfaceShape(shape);
    if (s !== undefined) {
      innerRingCache[shape] = offsetPolygon3D(s, SURFACE_EDGE_WIDTH);
    } else {
      innerRingCache[shape] = null;
      return;
    }
  }
  return innerRingCache[shape] ?? undefined;
}

function offsetPolygon3D(vertices: readonly Readonly<Vec3>[], offset: number): Vec3[] {
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

    const prevInward = normalizeVec3(crossVec3(normal, prevDir));
    const nextInward = normalizeVec3(crossVec3(normal, nextDir));

    const moveDir = normalizeVec3(addVec3(prevInward, nextInward));

    const cos = dotVec3(moveDir, prevInward);

    result.push(addVec3(curr, mulVec3(moveDir, offset / cos)));
  }

  return result;
}

/**
 * Builds geometry for a single Stormworks surface shape.
 *
 * @param shape - Stormworks surface shape ID.
 * @param options - Geometry generation options.
 * @returns Generated geometry, or `undefined` if the shape is unsupported.
 */
export function buildSurfaceGeometry(
  shape: number,
  options?: BuildSurfaceGeometryOptions,
): GeometryBuilder | undefined {
  const hollow = options?.hollow ?? false;
  const edge = hollow || (options?.edge ?? false);
  const color = options?.color;

  const outerRing = getSurfaceShape(shape);
  if (!outerRing) return;

  const n = outerRing.length;

  const builder = new GeometryBuilder();
  if (n < 3) return builder;

  if (edge) {
    const innerRing = getInnerRing(shape);
    if (!innerRing) return;

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

/**
 * Builds geometry from multiple Stormworks surfaces.
 *
 * If `options.cull` is enabled, hidden internal surfaces are removed
 * automatically before geometry generation.
 *
 * @param surfaces - Surfaces to convert.
 * @param options - Geometry generation options.
 * @returns The combined geometry.
 */
export function buildSurfacesGeometry(
  surfaces: readonly SurfaceData[],
  options?: BuildSurfaceGeometryOptions,
): GeometryBuilder {
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
    if (s === undefined) continue;
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
