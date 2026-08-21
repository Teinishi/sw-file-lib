import type { Vec3 } from "../internal";

export function partialToFullVec3(val?: Partial<Readonly<Vec3>>): Vec3 {
  return {
    x: val?.x ?? 0,
    y: val?.y ?? 0,
    z: val?.z ?? 0,
  };
}

export function minVec3(a: Vec3, b: Vec3) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    z: Math.min(a.z, b.z),
  };
}

export function maxVec3(a: Vec3, b: Vec3) {
  return {
    x: Math.max(a.x, b.x),
    y: Math.max(a.y, b.y),
    z: Math.max(a.z, b.z),
  };
}

export function vec3ToMap(value: Vec3, omitZero: boolean = false) {
  const m = new Map<string, number>();
  const { x, y, z } = value;
  if (!omitZero || x !== 0) m.set("x", x);
  if (!omitZero || y !== 0) m.set("y", y);
  if (!omitZero || z !== 0) m.set("z", z);
  return m;
}

export function addVec3(a: Readonly<Vec3>, b: Readonly<Vec3>): Vec3 {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

export function subVec3(a: Readonly<Vec3>, b: Readonly<Vec3>): Vec3 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}

export function mulVec3(a: Readonly<Vec3>, s: number): Vec3 {
  return {
    x: a.x * s,
    y: a.y * s,
    z: a.z * s,
  };
}

export function dotVec3(a: Readonly<Vec3>, b: Readonly<Vec3>) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function crossVec3(a: Readonly<Vec3>, b: Readonly<Vec3>): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function normalizeVec3(v: Readonly<Vec3>): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z);
  return mulVec3(v, 1 / len);
}

export function eqVec3(a: Readonly<Vec3>, b: Readonly<Vec3>) {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}
