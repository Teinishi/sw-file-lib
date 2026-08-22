export * from "./mat3";
export * from "./vec3";

export interface Vec2 {
  x: number;
  y: number;
}

export function modulo(a: number, b: number) {
  return ((a % b) + b) % b;
}
