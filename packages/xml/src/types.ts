import type { Vec3 } from "@internalUtils";

export type { Vec3 } from "@internalUtils";

export interface Surface {
  position?: Vec3;
  orientation?: number;
  shape?: number;
  rotation?: number;
  transType?: number;
  flags?: number;
  isReverseNormals?: boolean;
  isTwoSided?: boolean;
}

export interface LogicNode {
  position?: Vec3;
  orientation?: number;
  label?: string;
  mode?: number;
  type?: number;
  description?: string;
}

export interface Voxel {
  position?: Vec3;
  // physicsShapeRotation?: Mat4;
  flags?: number;
  physicsShape?: number;
  buoyPipes?: number;
}
