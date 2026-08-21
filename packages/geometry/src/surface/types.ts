import type { Color, Mat3, Vec3 } from "@sw-file-lib/internal-utils";
import type { BasicSurfaceShape } from ".";

export type BasicSurfaceOrientation = 0 | 1 | 2 | 3 | 4 | 5;

export function isValidSurfaceOrientation(
  orientation: number,
): orientation is BasicSurfaceOrientation {
  return orientation >= 0 && orientation <= 5;
}

export type BasicSurfaceRotation = 0 | 1 | 2 | 3;

export function isValidSurfaceRotation(rotation: number): rotation is BasicSurfaceRotation {
  return rotation >= 0 && rotation <= 3;
}

export interface ComponentSurfaceData {
  position?: Partial<Vec3> | undefined;
  matrix?: Mat3 | undefined;
  surfaces: {
    position: Partial<Vec3> | undefined;
    orientation?: number | undefined;
    rotation?: number | undefined;
    shape?: number | undefined;
    color?: Color;
  }[];
}

export interface SurfaceData {
  componentPosition?: Partial<Vec3> | undefined;
  componentMatrix?: Mat3 | undefined;
  localPosition?: Partial<Vec3> | undefined;
  position: Vec3;
  matrix: Mat3;
  isFlipped: boolean;
  orientation: BasicSurfaceOrientation;
  rotation: BasicSurfaceRotation;
  shape: BasicSurfaceShape;
  color?: Color;
}

export interface BuildSurfaceGeometryOptions {
  edge?: boolean;
  hollow?: boolean;
  color?: Color;
}
