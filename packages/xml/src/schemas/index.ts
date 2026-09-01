import { parseSwXml, type XmlWriterOptions } from "..";
import type { ParseOptions } from "../types";
import * as x from "../xml-schema";
import {
  ComponentDefinitionSchema,
  type ComponentDefinition,
  type ComponentDefinitionImmutable,
} from "./ComponentDefinition";
import {
  MicrocontrollerSchema,
  type Microcontroller,
  type MicrocontrollerImmutable,
} from "./Microcontroller";
import { VehicleSchema, type Vehicle, type VehicleImmutable } from "./Vehicle";

export * from "./common";

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

export { SchemaError, SchemaSerializeError } from "../xml-schema";

function parse(
  schema: x.ElementSchema<any>,
  rootTag: string,
  input: string | Uint8Array<ArrayBuffer>,
  options?: ParseOptions,
) {
  const tree = parseSwXml(input);
  return schema.parse(tree, rootTag, options);
}

function safeParse(
  schema: x.ElementSchema<any>,
  rootTag: string,
  input: string | Uint8Array<ArrayBuffer>,
  options?: ParseOptions,
) {
  const tree = parseSwXml(input);
  return schema.safeParse(tree, rootTag, options);
}

function serialize(
  schema: x.ElementSchema<any>,
  rootTag: string,
  data: x.Immutable<any>,
  options?: XmlWriterOptions,
) {
  return schema.serialize(data, rootTag, options).toString();
}

function safeSerialize(
  schema: x.ElementSchema<any>,
  rootTag: string,
  data: x.Immutable<any>,
  options?: XmlWriterOptions,
): x.Result<string, x.SchemaSerializeError> {
  const result = schema.safeSerialize(data, rootTag, options);
  if (!result.success) return result;
  return {
    success: true,
    data: result.data.toString(),
  };
}

/**
 * Parses a Stormworks component definition XML document.
 *
 * @throws {@link SchemaError} when the XML content does not match the component definition schema.
 */
export function parseComponentDefinitionXml(
  input: string | Uint8Array<ArrayBuffer>,
  options?: ParseOptions,
): ComponentDefinition {
  return parse(ComponentDefinitionSchema, "definition", input, options);
}

/**
 * Parses a Stormworks component definition XML document without throwing schema errors.
 */
export function safeParseComponentDefinitionXml(
  input: string | Uint8Array<ArrayBuffer>,
  options?: ParseOptions,
): x.Result<ComponentDefinition, x.SchemaError> {
  return safeParse(ComponentDefinitionSchema, "definition", input, options);
}

/**
 * Serializes a Stormworks component definition into an XML document.
 *
 * @throws {@link SchemaSerializeError} when the component definition cannot be serialized.
 */
export function serializeComponentDefinitionXml(
  data: ComponentDefinitionImmutable,
  options?: XmlWriterOptions,
): string {
  return serialize(ComponentDefinitionSchema, "definition", data, options);
}

/**
 * Serializes a Stormworks component definition into an XML document without throwing schema errors.
 */
export function safeSerializeComponentDefinitionXml(
  data: ComponentDefinitionImmutable,
  options?: XmlWriterOptions,
): x.Result<string, x.SchemaSerializeError> {
  return safeSerialize(ComponentDefinitionSchema, "definition", data, options);
}

/**
 * Parses a Stormworks microcontroller XML document.
 *
 * @throws {@link SchemaError} when the XML content does not match the microcontroller schema.
 */
export function parseMicrocontrollerXml(
  input: string | Uint8Array<ArrayBuffer>,
  options?: ParseOptions,
): Microcontroller {
  return parse(MicrocontrollerSchema, "microprocessor", input, options);
}

/**
 * Parses a Stormworks microcontroller XML document without throwing schema errors.
 */
export function safeParseMicrocontrollerXml(
  input: string | Uint8Array<ArrayBuffer>,
  options?: ParseOptions,
): x.Result<Microcontroller, x.SchemaError> {
  return safeParse(MicrocontrollerSchema, "microprocessor", input, options);
}

/**
 * Serializes a Stormworks microcontroller into an XML document.
 *
 * @throws {@link SchemaSerializeError} when the microcontroller cannot be serialized.
 */
export function serializeMicrocontrollerXml(
  data: MicrocontrollerImmutable,
  options?: XmlWriterOptions,
): string {
  return serialize(MicrocontrollerSchema, "microprocessor", data, options);
}

/**
 * Serializes a Stormworks microcontroller into an XML document without throwing schema errors.
 */
export function safeSerializeMicrocontrollerXml(
  data: MicrocontrollerImmutable,
  options?: XmlWriterOptions,
): x.Result<string, x.SchemaSerializeError> {
  return safeSerialize(MicrocontrollerSchema, "microprocessor", data, options);
}

/**
 * Parses a Stormworks vehicle XML document.
 *
 * @throws {@link SchemaError} when the XML content
 * does not match the vehicle schema.
 */
export function parseVehicleXml(
  input: string | Uint8Array<ArrayBuffer>,
  options?: ParseOptions,
): Vehicle {
  return parse(VehicleSchema, "vehicle", input, options);
}

/**
 * Parses a Stormworks vehicle XML document without throwing schema errors.
 */
export function safeParseVehicleXml(
  input: string | Uint8Array<ArrayBuffer>,
  options?: ParseOptions,
): x.Result<Vehicle, x.SchemaError> {
  return safeParse(VehicleSchema, "vehicle", input, options);
}

/**
 * Serializes a Stormworks vehicle into an XML document.
 *
 * @throws {@link SchemaSerializeError} when the vehicle cannot be serialized.
 */
export function serializeVehicleXml(data: VehicleImmutable, options?: XmlWriterOptions): string {
  return serialize(VehicleSchema, "vehicle", data, options);
}

/**
 * Serializes a Stormworks vehicle into an XML document without throwing schema errors.
 */
export function safeSerializeVehicleXml(
  data: VehicleImmutable,
  options?: XmlWriterOptions,
): x.Result<string, x.SchemaSerializeError> {
  return safeSerialize(VehicleSchema, "vehicle", data, options);
}
