import { Orientation } from "..";

/** Valid Stormworks `<surface orientation="...">` values for basic surfaces. */
export type BasicSurfaceOrientation = 0 | 1 | 2 | 3 | 4 | 5;

/** Return `true` when a value is a valid basic surface orientation id. */
export function isValidSurfaceOrientation(
  orientation: unknown,
): orientation is BasicSurfaceOrientation {
  return typeof orientation === "number" && orientation >= 0 && orientation <= 5;
}

/** Valid Stormworks `<surface rotation="...">` values for basic surfaces. */
export type BasicSurfaceRotation = 0 | 1 | 2 | 3;

/** Return `true` when a value is a valid basic surface rotation id. */
export function isValidSurfaceRotation(rotation: unknown): rotation is BasicSurfaceRotation {
  return typeof rotation === "number" && rotation >= 0 && rotation <= 3;
}

/**
 * Convert Stormworks surface orientation and rotation ids into an
 * {@link Orientation}.
 *
 * Use `toMat3()` on the returned value when building a `SurfaceData.matrix`.
 */
export function getSurfaceOrientation(
  orientation: BasicSurfaceOrientation,
  rotation: BasicSurfaceRotation,
) {
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
