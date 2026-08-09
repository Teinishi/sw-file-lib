import * as x from "../schemaLib";

export * from "./ComponentDefinition";
export * from "./Microcontroller";
export * from "./Vehicle";

export const SwVec2Schema = x.vec2();
export type SwVec2 = x.InferShape<typeof SwVec2Schema.shape>;

export const SwVec3Schema = x.vec3();
export type SwVec3 = x.InferShape<typeof SwVec3Schema.shape>;

export const SwRgbSchema = x.rgb();
export type SwRgb = x.InferShape<typeof SwRgbSchema.shape>;

export const SwMat3Schema = x.mat3();
export type SwMat3 = x.InferShape<typeof SwMat3Schema.shape>;
