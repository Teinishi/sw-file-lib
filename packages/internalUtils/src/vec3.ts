export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

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
