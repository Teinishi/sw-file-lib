import type { Vec3 } from "@sw-file-lib/core";
import type { SchemaParseOptions } from "./schemaLib";

/**
 * A Stormworks component surface definition.
 */
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

/**
 * A Stormworks logic node definition.
 */
export interface LogicNode {
  position?: Vec3;
  orientation?: number;
  label?: string;
  mode?: number;
  type?: number;
  description?: string;
}

/**
 * A Stormworks voxel definition.
 */
export interface Voxel {
  position?: Vec3;
  // physicsShapeRotation?: Mat4;
  flags?: number;
  physicsShape?: number;
  buoyPipes?: number;
}

/**
 * Options used when parsing Stormworks XML files.
 */
export type ParseOptions = SchemaParseOptions;
