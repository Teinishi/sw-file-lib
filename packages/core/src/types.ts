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

export function parseColor(value: string): Color | undefined;
export function parseColor(value: string, fallback: Color): Color;

export function parseColor(value: string, fallback?: Color): Color | undefined {
  if (value === "") return { r: 0, g: 0, b: 0 };
  if (value === "x") return { r: 255, g: 255, b: 255 };

  const hex = value.startsWith("#") ? value.slice(1) : value;
  if (hex.length !== 6 && hex.length !== 8) return fallback;

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : undefined;

  if ([r, g, b].some((v) => isNaN(v)) || (a !== undefined && isNaN(a))) return fallback;

  if (a !== undefined) {
    return { r, g, b, a };
  } else {
    return { r, g, b };
  }
}
