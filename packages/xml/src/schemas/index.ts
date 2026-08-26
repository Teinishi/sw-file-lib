import * as x from "../xml-schema";

export * from "./ComponentDefinition";
export * from "./Microcontroller";
export * from "./Vehicle";
export { SchemaError } from "../xml-schema";

export const SwVec2Schema = x.partialObject({
  x: x.number(),
  y: x.number(),
});
export type SwVec2 = x.Infer<typeof SwVec2Schema>;
export type SwVec2Immutable = x.InferImmutable<typeof SwVec2Schema>;

export const SwVec3Schema = x.partialObject({
  x: x.number(),
  y: x.number(),
  z: x.number(),
});
export type SwVec3 = x.Infer<typeof SwVec3Schema>;
export type SwVec3Immutable = x.InferImmutable<typeof SwVec3Schema>;

export const SwRgbSchema = x.partialObject({
  r: x.number(),
  g: x.number(),
  b: x.number(),
});
export type SwRgb = x.Infer<typeof SwRgbSchema>;
export type SwRgbImmutable = x.InferImmutable<typeof SwRgbSchema>;

export const SwMat3Schema = x.partialObject({
  "00": x.number(),
  "01": x.number(),
  "02": x.number(),
  "10": x.number(),
  "11": x.number(),
  "12": x.number(),
  "20": x.number(),
  "21": x.number(),
  "22": x.number(),
});
export type SwMat3 = x.Infer<typeof SwMat3Schema>;
export type SwMat3Immutable = x.InferImmutable<typeof SwMat3Schema>;
