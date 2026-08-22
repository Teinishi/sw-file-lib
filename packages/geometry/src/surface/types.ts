import type { Color } from "@sw-file-lib/core/color";
import type { Mat3, Vec3 } from "@sw-file-lib/core/math";
import type { BasicSurfaceShape } from ".";

/** A resolved component surface ready for geometry generation. */
export interface SurfaceData {
  /** Surface origin in Stormworks voxel units. It is scaled by `0.25` when geometry is built. */
  position: Vec3;
  /** Row-major orientation matrix in Stormworks' left-handed coordinate system. */
  matrix: Mat3;
  /** Whether the surface transform includes a mirror/reflection. Used by culling. */
  isFlipped: boolean;
  /** Stormworks basic surface shape id. */
  shape: BasicSurfaceShape;
  /** Optional per-surface color. Channel values are `0` to `255`. */
  color?: Color;
}

/** Options used when generating geometry from Stormworks basic surfaces. */
export interface BuildSurfaceGeometryOptions {
  /** Add the dark bevel/edge strip around each generated surface. */
  edge?: boolean;
  /** Generate only the edge strip, leaving the center open. Implies `edge`. */
  hollow?: boolean;
  /** Default color used when a `SurfaceData` entry does not provide one. */
  color?: Color;
  /** Remove fully covered adjacent surfaces before geometry generation. Defaults to `true`. */
  cull?: boolean;
}
