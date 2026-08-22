import type { Vec3 } from ".";

export type Mat3 = [number, number, number, number, number, number, number, number, number];

export function isMat3(value: unknown): value is Mat3 {
  return Array.isArray(value) && value.length === 9 && value.every((v) => typeof v === "number");
}

export function transposeMat3(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

export function mulMat3(a: Readonly<Mat3>, b: Readonly<Mat3>): Mat3 {
  const r: Mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        r[3 * i + j]! += a[3 * i + k]! * b[3 * k + j]!;
      }
    }
  }
  return r;
}

export function mulMat3Vec3(m: Readonly<Mat3>, v: Readonly<Vec3>): Vec3 {
  return {
    x: v.x * m[0] + v.y * m[1] + v.z * m[2],
    y: v.x * m[3] + v.y * m[4] + v.z * m[5],
    z: v.x * m[6] + v.y * m[7] + v.z * m[8],
  };
}

export function detMat3(m: Readonly<Mat3>) {
  return (
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6])
  );
}

export function parseMat3(value: string): Mat3 | undefined {
  const parts = value.split(",").map((v) => parseFloat(v.trim()));
  if (parts.length !== 9 || parts.some((v) => isNaN(v))) return undefined;
  return parts as Mat3;
}
