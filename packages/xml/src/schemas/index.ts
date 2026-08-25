import * as x from "../xml-schema";

export * from "./ComponentDefinition";
export * from "./Microcontroller";
export * from "./Vehicle";
export { SchemaError } from "../xml-schema";

export const SwVec2Schema = x.vec2();
export type SwVec2 = x.Infer<typeof SwVec2Schema>;
export type SwVec2Immutable = x.InferReadonly<typeof SwVec2Schema>;

export const SwVec3Schema = x.vec3();
export type SwVec3 = x.Infer<typeof SwVec3Schema>;
export type SwVec3Immutable = x.InferReadonly<typeof SwVec3Schema>;

export const SwRgbSchema = x.rgb();
export type SwRgb = x.Infer<typeof SwRgbSchema>;
export type SwRgbImmutable = x.InferReadonly<typeof SwRgbSchema>;

export const SwMat3Schema = x.mat3();
export type SwMat3 = x.Infer<typeof SwMat3Schema>;
export type SwMat3Immutable = x.InferReadonly<typeof SwMat3Schema>;
