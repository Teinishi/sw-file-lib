import type { DeepReadonly } from "ts-essentials";
import { modulo } from "@sw-file-lib/internal-utils";
import {
  Orientation,
  type BasicSurfaceOrientation,
  type BasicSurfaceRotation,
  type ShapeEdgeCoverage,
} from "..";

export function compareCoverage(
  a: DeepReadonly<ShapeEdgeCoverage>,
  b: DeepReadonly<ShapeEdgeCoverage>,
  start: number = 0,
  flip: boolean = false,
) {
  let na = 0;
  let nb = 0;

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const k = 4 * i + j;

      na |= (a[i]![j]! ? 1 : 0) << k;

      if (flip) {
        nb |= (b[modulo(start - i - 1, 4)]![3 - j]! ? 1 : 0) << k;
      } else {
        nb |= (b[modulo(start + i, 4)]![j]! ? 1 : 0) << k;
      }
    }
  }

  return {
    isACovered: (na | nb) === nb,
    isBCovered: (na | nb) === na,
  };
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
      o = Orientation.RotateX90;
      break;
    case 2:
      o = Orientation.RotateX180;
      break;
    case 3:
      o = Orientation.RotateX270;
      break;
  }

  switch (orientation) {
    case 1:
      o = o.multiply(Orientation.RotateZ180);
      break;
    case 2:
      o = o.multiply(Orientation.RotateZ90);
      break;
    case 3:
      o = o.multiply(Orientation.RotateZ270);
      break;
    case 4:
      o = o.multiply(Orientation.RotateZ90).multiply(Orientation.RotateX90);
      break;
    case 5:
      o = o.multiply(Orientation.RotateZ90).multiply(Orientation.RotateX270);
      break;
  }

  return o;
}
