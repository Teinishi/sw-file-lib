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

export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}
