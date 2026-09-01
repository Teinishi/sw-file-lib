import * as THREE from "three";
import type { Mat3, Vec3 } from "@sw-file-lib/core/math";

export function stormworksToThreeMatrix4(rot: Mat3, pos: Vec3, posScale = 1): THREE.Matrix4 {
  return new THREE.Matrix4().set(
    rot[0],
    rot[1],
    -rot[2],
    pos.x * posScale,
    rot[3],
    rot[4],
    -rot[5],
    pos.y * posScale,
    -rot[6],
    -rot[7],
    rot[8],
    -pos.z * posScale,
    0,
    0,
    0,
    1,
  );
}
