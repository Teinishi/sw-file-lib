export * from "./mat3";
export * from "./vec3";

export function modulo(a: number, b: number) {
  return ((a % b) + b) % b;
}
