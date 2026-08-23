/** RGBA color with 8-bit channel values. */
export interface Color {
  /** Red channel, from `0` to `255`. */
  r: number;
  /** Green channel, from `0` to `255`. */
  g: number;
  /** Blue channel, from `0` to `255`. */
  b: number;
  /** Optional alpha channel, from `0` to `255`. */
  a?: number;
}

/**
 * Check whether a value is a `Color` object.
 */
export function isColor(value: unknown): value is Color {
  if (typeof value !== "object" || value === null) return false;

  const color = value as Color;
  if (typeof color.r !== "number" || typeof color.g !== "number" || typeof color.b !== "number") {
    return false;
  }

  if (color.a !== undefined && typeof color.a !== "number") {
    return false;
  }

  return true;
}

/**
 * Parse a Stormworks-style color string.
 *
 * Accepts `RRGGBB`, `RRGGBBAA`, and the same values prefixed with `#`.
 * Stormworks' special values are also supported: `""` is black and `"x"` is
 * white. Invalid values return `undefined`.
 */
export function parseColor(value: string): Color | undefined;
/**
 * Parse a Stormworks-style color string, returning `fallback` when the value is
 * invalid.
 */
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
