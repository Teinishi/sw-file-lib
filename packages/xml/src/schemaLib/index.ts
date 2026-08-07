import { number } from "./number";
import { object } from "./object";

export * from "./types";
export * from "./optional";
export * from "./boolean";
export * from "./number";
export * from "./string";
export * from "./object";
export * from "./list";

export function vec3() {
  return object({
    x: number(),
    y: number(),
    z: number(),
  }).partial();
}
