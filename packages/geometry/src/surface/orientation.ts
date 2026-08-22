import { Orientation } from "..";

export type BasicSurfaceOrientation = 0 | 1 | 2 | 3 | 4 | 5;

export function isValidSurfaceOrientation(
  orientation: unknown,
): orientation is BasicSurfaceOrientation {
  return typeof orientation === "number" && orientation >= 0 && orientation <= 5;
}

export type BasicSurfaceRotation = 0 | 1 | 2 | 3;

export function isValidSurfaceRotation(rotation: unknown): rotation is BasicSurfaceRotation {
  return typeof rotation === "number" && rotation >= 0 && rotation <= 3;
}

// <surface> の orientation と rotation から Orientation オブジェクトへ変換
// .toMat3() をつければ行列に
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
