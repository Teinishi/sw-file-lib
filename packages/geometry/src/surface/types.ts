import type { Color, Mat3, Vec3 } from "@sw-file-lib/core";
import type { BasicSurfaceShape } from ".";

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
  position: Vec3;
  matrix: Mat3;
  isFlipped: boolean;
  shape: BasicSurfaceShape;
  color?: Color;
}

export interface BuildSurfaceGeometryOptions {
  edge?: boolean;
  hollow?: boolean;
  color?: Color;
  cull?: boolean;
}
