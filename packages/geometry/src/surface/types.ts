import type { ReadonlyColor } from "@sw-file-lib/core/color";
import type { ReadonlyMat3, ReadonlyVec3 } from "@sw-file-lib/core/math";

/**
 * A flattened Stormworks surface with its final transform applied.
 *
 * Unlike the `<surface>` element in a component definition, `SurfaceData`
 * stores the surface position and orientation after the component hierarchy
 * has been resolved. This representation is used for operations that work
 * across multiple components, such as surface culling and vehicle mesh
 * generation.
 */
export interface SurfaceData {
  /** Vehicle-space position of the surface. */
  readonly position: ReadonlyVec3;
  /** Vehicle-space orientation matrix of the surface. */
  readonly matrix: ReadonlyMat3;
  /**
   * Stormworks surface shape ID.
   *
   * This is the same numeric value as the `shape` attribute of a
   * `<surface>` element.
   */
  readonly shape: number;
  /** Surface color. */
  readonly color?: ReadonlyColor;
}

/**
 * Options for surface geometry generation.
 */
export interface BuildSurfaceGeometryOptions {
  /**
   * Generates a border by offsetting the surface inward.
   *
   * @default false
   */
  readonly edge?: boolean;
  /**
   * Generates only the border geometry.
   *
   * Implies `edge=true`.
   *
   * @default false
   */
  readonly hollow?: boolean;
  /**
   * Default color used when a `SurfaceData` entry does not provide one.
   *
   * Defaults to white.
   */
  readonly color?: ReadonlyColor;
  /**
   * Removes hidden internal surfaces before generating geometry.
   *
   * This option is only used by {@link buildSurfacesGeometry}.
   *
   * @default true
   */
  readonly cull?: boolean;
}
