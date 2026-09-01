/**
 * Utilities for mathematical operations, including vector and matrix math.
 *
 * @packageDocumentation
 */

export * from "./mat3";
export * from "./vec3";
export * from "./orientation";

/** A simple two-dimensional numeric vector. */
export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Read only {@link Vec2} type.
 *
 * Type alias for function parameters that do not modify the vector.
 */
export interface ReadonlyVec2 {
  readonly x: number;
  readonly y: number;
}

/** Positive modulo, useful for cyclic indices. */
export function modulo(a: number, b: number): number {
  return ((a % b) + b) % b;
}
