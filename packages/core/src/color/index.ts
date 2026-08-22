export interface Color {
  /* 0-255 */
  r: number;
  /* 0-255 */
  g: number;
  /* 0-255 */
  b: number;
  /* 0-255 */
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
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : undefined;

  if ([r, g, b].some((v) => isNaN(v)) || (a !== undefined && isNaN(a))) return fallback;

  if (a !== undefined) {
    return { r, g, b, a };
  } else {
    return { r, g, b };
  }
}
