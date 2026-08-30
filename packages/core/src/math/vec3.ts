/** A simple three-dimensional numeric vector. */
export interface Vec3 {
  /** X component. */
  x: number;
  /** Y component. */
  y: number;
  /** Z component. */
  z: number;
}

/** Create a full vector from a partial value, using `0` for omitted components. */
export function vec3(val?: Partial<Readonly<Vec3>>): Vec3 {
  return {
    x: val?.x ?? 0,
    y: val?.y ?? 0,
    z: val?.z ?? 0,
  };
}

/** Return the component-wise minimum of two vectors. */
export function minVec3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    z: Math.min(a.z, b.z),
  };
}

/** Return the component-wise maximum of two vectors. */
export function maxVec3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: Math.max(a.x, b.x),
    y: Math.max(a.y, b.y),
    z: Math.max(a.z, b.z),
  };
}

/** Add two vectors component-wise. */
export function addVec3(a: Readonly<Vec3>, b: Readonly<Vec3>): Vec3 {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

/** Subtract `b` from `a` component-wise. */
export function subVec3(a: Readonly<Vec3>, b: Readonly<Vec3>): Vec3 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}

/** Multiply every component by a scalar. */
export function mulVec3(a: Readonly<Vec3>, s: number): Vec3 {
  return {
    x: a.x * s,
    y: a.y * s,
    z: a.z * s,
  };
}

/** Return the dot product of two vectors. */
export function dotVec3(a: Readonly<Vec3>, b: Readonly<Vec3>): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Return the right-handed cross product `a x b`. */
export function crossVec3(a: Readonly<Vec3>, b: Readonly<Vec3>): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/** Return a unit-length vector in the same direction as `v`. */
export function normalizeVec3(v: Readonly<Vec3>): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z);
  return mulVec3(v, 1 / len);
}

/** Return `true` when all vector components are exactly equal. */
export function eqVec3(a: Readonly<Vec3>, b: Readonly<Vec3>): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}
