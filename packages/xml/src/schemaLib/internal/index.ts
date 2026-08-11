import {
  newSchemaParseContext,
  SchemaError,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
  type SchemaIssue,
  type SchemaIssueBase,
  type SchemaIssueMap,
  type UnknownFieldCallback,
  type UnknownFieldMode,
  selectChild,
  type AnySchemaIssue,
  type Shape,
  prependSchemaIssuePath,
  type ElementSchemaSerializeResult,
} from "..";
import { parseSwXml, SwXmlNode, SwXmlNodeList, type DuplicateChildElementMode } from "../../parser";
import { XmlWriter, type XmlWriterOptions } from "../../writer/XmlWriter";

export function createSwXmlIssue<T extends keyof SchemaIssueMap>(
  code: T,
  issue: SchemaIssueMap[T] & Omit<SchemaIssueBase<T>, "code" | "path">,
): SchemaIssue<T> {
  return {
    ...issue,
    code,
    path: [],
  };
}

export function assertString(value: SchemaInput, schemaName: string): asserts value is string {
  if (typeof value === "string") return;
  if (value === undefined) {
    throw new SchemaError([
      createSwXmlIssue("missing_required_field", {
        message: `Required ${schemaName} field is missing.`,
        expected: "string",
      }),
    ]);
  } else {
    throw new SchemaError([
      createSwXmlIssue("invalid_type", {
        message: `Expected string, received ${describeSchemaInput(value)}.`,
        expected: "string",
        value,
      }),
    ]);
  }
}

export function assertXmlNode(value: SchemaInput, schemaName: string): asserts value is SwXmlNode {
  if (isSwXmlNode(value)) return;
  if (value === undefined) {
    throw new SchemaError([
      createSwXmlIssue("missing_required_field", {
        message: `Required ${schemaName} field is missing.`,
        expected: "xml_element",
      }),
    ]);
  } else {
    throw new SchemaError([
      createSwXmlIssue("invalid_type", {
        message: `Expected XML element, received ${describeSchemaInput(value)}.`,
        expected: "xml_element",
        value,
      }),
    ]);
  }
}

export function describeSchemaInput(value: SchemaInput): string {
  if (value === undefined) return "undefined";
  if (typeof value === "string") return "string";
  if (isSwXmlNode(value)) return `<${value.tag}>`;
  return typeof value;
}

function isSwXmlNode(value: SchemaInput): value is SwXmlNode {
  return typeof value === "object" && value !== null && "tag" in value && "attrs" in value;
}

// record 要素の属性と子要素を shape でパース
export function parseRecordElement(
  value: SwXmlNode,
  shape: Shape,
  ctx?: SchemaParseContext,
  options?: SchemaParseOptions,
  prependPath: (string | number)[] = [],
) {
  const parsed: Record<string, unknown> = {};
  const issues: AnySchemaIssue[] = [];

  for (const [key, schema] of Object.entries(shape)) {
    let parsedValue;
    try {
      parsedValue = schema.parseField(value, key, ctx, options);
    } catch (error) {
      if (error instanceof SchemaError) {
        issues.push(...prependSchemaIssuePath(error, [...prependPath, key]).issues);
        continue;
      }
      throw error;
    }

    if (parsedValue !== undefined || hasField(value, key)) {
      parsed[key] = parsedValue;
    }
  }

  return { parsed, issues };
}

function hasField(parent: SwXmlNode, key: string): boolean {
  return parent.attrs.has(key) || parent.nodes.some((child) => child.tag === key);
}

export function evaluateUnknownFieldMode(
  ctx: SchemaParseContext = newSchemaParseContext(),
  target: Parameters<UnknownFieldCallback>[1],
  options?: SchemaParseOptions,
): UnknownFieldMode {
  if (typeof options?.unknownField === "function") {
    return options.unknownField(ctx, target);
  } else {
    return options?.unknownField ?? "error";
  }
}

export function evaluateDuplicateChildElementMode(
  ctx: SchemaParseContext = newSchemaParseContext(),
  target: string,
  options?: SchemaParseOptions,
): DuplicateChildElementMode {
  if (typeof options?.duplicateChildElement === "function") {
    return options.duplicateChildElement(ctx, target);
  } else {
    return options?.duplicateChildElement ?? "error";
  }
}

export function safeParse<T>(getData: () => T): SchemaSafeParseResult<T> {
  try {
    return {
      success: true,
      data: getData(),
    };
  } catch (error) {
    if (error instanceof SchemaError) {
      return {
        success: false,
        error,
      };
    }
    throw error;
  }
}

export function parseTree<T>(
  schemaName: string,
  tree: SwXmlNodeList | string | Uint8Array<ArrayBufferLike>,
  rootTag: string,
  options: SchemaParseOptions | undefined,
  getData: (el: SwXmlNode, ctx: SchemaParseContext, options: SchemaParseOptions | undefined) => T,
): T {
  if (!(tree instanceof SwXmlNodeList)) {
    tree = parseSwXml(tree);
  }

  const ctx = newSchemaParseContext();
  const child = selectChild(tree, rootTag, ctx, options);
  if (child === undefined) {
    throw new SchemaError([
      createSwXmlIssue("missing_required_field", {
        message: `Required ${schemaName} field is missing.`,
        expected: "xml_element",
      }),
    ]);
  }
  return getData(child.value, child.newCtx, options);
}

export function serializeElement(
  name: string,
  serializeResult: ElementSchemaSerializeResult,
  writer?: XmlWriter | XmlWriterOptions,
): XmlWriter {
  if (serializeResult.kind === "failed") {
    throw new Error("todo: error message");
  }

  if (!(writer instanceof XmlWriter)) {
    writer = new XmlWriter(writer);
  }

  serializeResult.write(name, writer);
  return writer;
}
