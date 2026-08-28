import { parseSwXml } from "..";
import type { ParseOptions } from "../types";
import * as x from "../xml-schema";
import { ComponentDefinitionSchema, type ComponentDefinition } from "./ComponentDefinition";
import { MicrocontrollerSchema, type Microcontroller } from "./Microcontroller";
import { VehicleSchema, type Vehicle } from "./Vehicle";

export {
  ComponentDefinitionSchema,
  type ComponentDefinition,
  type ComponentDefinitionImmutable,
} from "./ComponentDefinition";
export * as ComponentDefinitionSchemas from "./ComponentDefinition";

export {
  MicrocontrollerSchema,
  type Microcontroller,
  type MicrocontrollerImmutable,
} from "./Microcontroller";
export * as MicrocontrollerSchemas from "./Microcontroller";

export { VehicleSchema, type Vehicle, type VehicleImmutable } from "./Vehicle";
export * as VehicleSchemas from "./Vehicle";

export { SchemaError } from "../xml-schema";

export const SwVec2Schema = x.partialObject({
  x: x.number(),
  y: x.number(),
});
export interface SwVec2 extends x.Infer<typeof SwVec2Schema> {}
export interface SwVec2Immutable extends x.InferImmutable<typeof SwVec2Schema> {}

export const SwVec3Schema = x.partialObject({
  x: x.number(),
  y: x.number(),
  z: x.number(),
});
export interface SwVec3 extends x.Infer<typeof SwVec3Schema> {}
export interface SwVec3Immutable extends x.InferImmutable<typeof SwVec3Schema> {}

export const SwRgbSchema = x.partialObject({
  r: x.number(),
  g: x.number(),
  b: x.number(),
});
export interface SwRgb extends x.Infer<typeof SwRgbSchema> {}
export interface SwRgbImmutable extends x.InferImmutable<typeof SwRgbSchema> {}

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
export interface SwMat3 extends x.Infer<typeof SwMat3Schema> {}
export interface SwMat3Immutable extends x.InferImmutable<typeof SwMat3Schema> {}

/**
 * Parses a Stormworks component definition XML document.
 *
 * @throws {@link SchemaError} when the XML content
 * does not match the component definition schema.
 */
export function parseComponentDefinitionXml(
  input: string | Uint8Array<ArrayBuffer>,
  options: ParseOptions = {},
): ComponentDefinition {
  const tree = parseSwXml(input);
  return ComponentDefinitionSchema.parse(tree, "definition", options);
}

/**
 * Parses a Stormworks component definition XML document without throwing schema errors.
 */
export function safeParseComponentDefinitionXml(
  input: string | Uint8Array<ArrayBuffer>,
  options: ParseOptions = {},
): x.Result<ComponentDefinition, x.SchemaError> {
  const tree = parseSwXml(input);
  return ComponentDefinitionSchema.safeParse(tree, "definition", options);
}

/**
 * Parses a Stormworks microcontroller XML document.
 *
 * @throws {@link SchemaError} when the XML content
 * does not match the microcontroller schema.
 */
export function parseMicrocontrollerXml(
  input: string | Uint8Array<ArrayBuffer>,
  options: ParseOptions = {},
): Microcontroller {
  const tree = parseSwXml(input);
  return MicrocontrollerSchema.parse(tree, "microprocessor", options);
}

/**
 * Parses a Stormworks microcontroller XML document without throwing schema errors.
 */
export function safeParseMicrocontrollerXml(
  input: string | Uint8Array<ArrayBuffer>,
  options: ParseOptions = {},
): x.Result<Microcontroller, x.SchemaError> {
  const tree = parseSwXml(input);
  return MicrocontrollerSchema.safeParse(tree, "microprocessor", options);
}

/**
 * Parses a Stormworks vehicle XML document.
 *
 * @throws {@link SchemaError} when the XML content
 * does not match the vehicle schema.
 */
export function parseVehicleXml(
  input: string | Uint8Array<ArrayBuffer>,
  options: ParseOptions = {},
): Vehicle {
  const tree = parseSwXml(input);
  return VehicleSchema.parse(tree, "vehicle", options);
}

/**
 * Parses a Stormworks vehicle XML document without throwing schema errors.
 */
export function safeParseVehicleXml(
  input: string | Uint8Array<ArrayBuffer>,
  options: ParseOptions = {},
): x.Result<Vehicle, x.SchemaError> {
  const tree = parseSwXml(input);
  return VehicleSchema.safeParse(tree, "vehicle", options);
}
