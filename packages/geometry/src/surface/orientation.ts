import { Orientation } from "@sw-file-lib/core/math";

/**
 * The six axis-aligned surface orientations used by Stormworks.
 */
export type BasicSurfaceOrientation = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Returns whether a value is a valid {@link BasicSurfaceOrientation}.
 *
 * @param orientation - Value to test.
 */
export function isValidSurfaceOrientation(
  orientation: unknown,
): orientation is BasicSurfaceOrientation {
  return typeof orientation === "number" && orientation >= 0 && orientation <= 5;
}

/**
 * Quarter-turn rotation around the surface normal.
 */
export type BasicSurfaceRotation = 0 | 1 | 2 | 3;

/**
 * Returns whether a value is a valid {@link BasicSurfaceRotation}.
 *
 * @param rotation - Value to test.
 */

export function isValidSurfaceRotation(rotation: unknown): rotation is BasicSurfaceRotation {
  return typeof rotation === "number" && rotation >= 0 && rotation <= 3;
}

/**
 * Converts a Stormworks surface orientation into an {@link Orientation}.
 *
 * @param orientation - Base surface orientation.
 * @param rotation - Quarter-turn rotation.
 * @returns The corresponding orientation.
 */
export function getSurfaceOrientation(
  orientation: BasicSurfaceOrientation,
  rotation: BasicSurfaceRotation,
): Orientation {
  let o = Orientation.Identity;
  switch (rotation) {
    case 1:
      o = Orientation.RotateX270;
      break;
    case 2:
      o = Orientation.RotateX180;
      break;
    case 3:
      o = Orientation.RotateX90;
      break;
  }

  switch (orientation) {
    case 1:
      o = o.multiply(Orientation.RotateZ180);
      break;
    case 2:
      o = o.multiply(Orientation.RotateZ270);
      break;
    case 3:
      o = o.multiply(Orientation.RotateZ90);
      break;
    case 4:
      o = o.multiply(Orientation.RotateZ270).multiply(Orientation.RotateX270);
      break;
    case 5:
      o = o.multiply(Orientation.RotateZ270).multiply(Orientation.RotateX90);
      break;
  }

  return o;
}
