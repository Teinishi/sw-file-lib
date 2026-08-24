export * from "./mat3";
export * from "./vec3";

/** A simple two-dimensional numeric vector. */
export interface Vec2 {
  /** X component. */
  x: number;
  /** Y component. */
  y: number;
}

/** Positive modulo, useful for cyclic indices. */
export function modulo(a: number, b: number): number {
  return ((a % b) + b) % b;
}
