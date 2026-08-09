import { number } from "./number";
import { object } from "./object";

export * from "./types";
export * from "./errors";
export * from "./utils";
export * from "./optional";
export * from "./union";
export * from "./boolean";
export * from "./number";
export * from "./string";
export * from "./object";
export * from "./list";

/**
 * Creates a schema for Stormworks 2D vector records with optional x and y fields.
 */
export function vec2() {
  return object({
    x: number(),
    y: number(),
  }).partial();
}

/**
 * Creates a schema for Stormworks 3D vector records with optional x, y, and z fields.
 */
export function vec3() {
  return object({
    x: number(),
    y: number(),
    z: number(),
  }).partial();
}

/**
 * Creates a schema for Stormworks RGB color records with optional r, g, and b fields.
 */
export function rgb() {
  return object({
    r: number(),
    g: number(),
    b: number(),
  }).partial();
}

/**
 * Creates a schema for Stormworks 3x3 matrix records with optional "00" to "22" fields.
 */
export function mat3() {
  return object({
    "00": number(),
    "01": number(),
    "02": number(),
    "10": number(),
    "11": number(),
    "12": number(),
    "20": number(),
    "21": number(),
    "22": number(),
  }).partial();
}
