import type { Vec3 } from "@core";
import type { SchemaParseOptions } from "./schemaLib";

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

export interface ParseOptions extends SchemaParseOptions {
  noDuplicateElement?: boolean;
}
