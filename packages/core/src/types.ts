export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type Mat3 = [number, number, number, number, number, number, number, number, number];

export function parseMat3(value: string): Mat3 | undefined {
  const parts = value.split(",").map((v) => parseFloat(v.trim()));
  if (parts.length !== 9 || parts.some((v) => isNaN(v))) return undefined;
  return parts as Mat3;
}

export function isMat3(value: unknown): value is Mat3 {
  return Array.isArray(value) && value.length === 9 && value.every((v) => typeof v === "number");
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}
