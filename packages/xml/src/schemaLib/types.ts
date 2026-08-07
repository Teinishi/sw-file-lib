import type { SwXmlSchemaError } from ".";
import type { RawXmlTreeValue } from "../parser";

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
}

/**
 * A schema that parses a raw Stormworks XML tree value into a typed value.
 */
export interface Schema<T> {
  /**
   * Parses a raw Stormworks XML tree value.
   *
   * @throws {@link SwXmlSchemaError} when the value does not match the schema.
   */
  parse(value: RawXmlTreeValue | undefined, options?: SchemaParseOptions): T;

  /**
   * Parses a raw Stormworks XML tree value without throwing schema errors.
   */
  safeParse(
    value: RawXmlTreeValue | undefined,
    options?: SchemaParseOptions,
  ): SchemaSafeParseResult<T>;

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

export type UnknownValue = string | UnknownObject | UnknownValue[];

export interface UnknownObject {
  [key: string]: UnknownValue;
}

export type Shape = Record<string, Schema<any>>;

export type InferShape<T extends Shape> = {
  [K in keyof T]: T[K] extends Schema<infer U> ? U : never;
} & { [key: string]: UnknownValue };

export type Infer<T extends Schema<any>> = T extends Schema<infer U> ? U : never;
