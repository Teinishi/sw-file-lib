import type { SwXmlNode } from "../parser";
import type { SwXmlSchemaError } from "./errors";

/**
 * A value accepted by schemas.
 *
 * Top-level schemas usually receive an {@link SwXmlNode}. Primitive schemas may
 * receive an attribute string when they are used as fields in an object schema.
 */
export type SchemaInput = SwXmlNode | string | undefined;

/**
 * The result returned by {@link Schema.safeParse}.
 */
export type SchemaSafeParseResult<T> =
  | {
      /**
       * Whether parsing succeeded.
       */
      success: true;

      /**
       * The parsed value.
       */
      data: T;
    }
  | {
      /**
       * Whether parsing succeeded.
       */
      success: false;

      /**
       * The schema error containing all collected issues.
       */
      error: SwXmlSchemaError;
    };

export interface SchemaParseOptions {
  /**
   * Removes fields that are not declared in the schema.
   */
  omitUnknownField?: boolean;

  /**
   * Allows numeric fields to parse to NaN.
   */
  allowNaN?: boolean;

  /**
   * Requires record child elements to be unique.
   *
   * When false, object fields use the last matching child element.
   */
  noDuplicateElement?: boolean;
}

/**
 * A schema that parses a Stormworks XML node into a typed value.
 */
export interface Schema<T> {
  /**
   * Parses a Stormworks XML node or attribute value.
   *
   * @throws {@link SwXmlSchemaError} when the value does not match the schema.
   */
  parse(value: SchemaInput, options?: SchemaParseOptions): T;

  /**
   * Parses a Stormworks XML node or attribute value without throwing schema errors.
   */
  safeParse(value: SchemaInput, options?: SchemaParseOptions): SchemaSafeParseResult<T>;

  /**
   * Parses one field from an XML record node.
   *
   * Primitive schemas read attributes. Object and list schemas read child
   * elements. This lets schemas decide how to interpret XML structure instead
   * of relying on a schema-free record/list guess.
   */
  parseField(parent: SwXmlNode, key: string, options?: SchemaParseOptions): T;

  /**
   * Serializes a typed value into a raw XML-compatible value.
   */
  serialize(value: T): unknown;

  /**
   * Returns a schema that accepts undefined values.
   */
  optional(): Schema<T | undefined>;
}

export type PartialShape<T extends Shape> = {
  [K in keyof T]: Schema<(T[K] extends Schema<infer U> ? U : never) | undefined>;
};

export type UnknownValue = string | null | UnknownObject | UnknownValue[];

export interface UnknownObject {
  [key: string]: UnknownValue;
}

export type Shape = Record<string, Schema<any>>;

export type InferShape<T extends Shape> = {
  [K in keyof T]: T[K] extends Schema<infer U> ? U : never;
} & { [key: string]: UnknownValue };

export type Infer<T extends Schema<any>> = T extends Schema<infer U> ? U : never;
