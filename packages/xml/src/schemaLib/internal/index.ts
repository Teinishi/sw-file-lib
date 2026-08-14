import {
  SchemaError,
  SchemaSerializeError,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaIssue,
  type SchemaIssueBase,
  type SchemaIssueMap,
  type UnknownFieldMode,
  type AnySchemaIssue,
  type Shape,
  prependSchemaIssuePath,
  type ElementSchemaSerializeResult,
  OptionalSchema,
  type InferShape,
  type ExpectedSchemaInputType,
  type Result,
  type Schema,
  type ElementSchema,
  type SchemaParseFieldChildResult,
  type SwXmlPath,
  type SchemaPath,
  type UnknownFieldData,
  type DuplicateChildElementData,
} from "..";
import { parseSwXml, SwXmlNode, SwXmlNodeList, type DuplicateChildElementMode } from "../../parser";
import { escapeXmlAttribute, XmlWriter, type XmlWriterOptions } from "../../writer/XmlWriter";

export function newSchemaParseContext(root: SwXmlNodeList): SchemaParseContext {
  return {
    xmlPath: [],
    root,
    element: undefined,
    schemaPath: [],
  };
}

export function extendSchemaParseContext(
  ctx: SchemaParseContext,
  extendXmlPath: SwXmlPath,
  extendSchemaPath: SchemaPath,
): SchemaParseContext {
  let node = ctx.element;
  if (ctx.xmlPath.length === 0) {
    const i = extendXmlPath[0]?.index;
    if (i !== undefined) {
      node = ctx.root.nodes[i];
    }
    for (const seg of extendXmlPath.slice(1)) {
      node = node?.nodes[seg.index];
    }
  } else {
    for (const seg of extendXmlPath) {
      node = node?.nodes[seg.index];
    }
  }

  return {
    xmlPath: ctx.xmlPath.concat(extendXmlPath),
    root: ctx.root,
    element: node,
    schemaPath: ctx.schemaPath.concat(extendSchemaPath),
  };
}

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

export function createMissingRequiredFieldError(
  expected: ExpectedSchemaInputType,
  schemaName: string,
) {
  return new SchemaError([
    createSwXmlIssue("missing_required_field", {
      message: `Required ${schemaName} field is missing.`,
      expected,
    }),
  ]);
}

export function createSchemaSerializeTypeError(
  expected: string,
  value: unknown,
  schemaName: string,
): SchemaSerializeError {
  return new SchemaSerializeError([
    {
      path: [],
      message: `Expected ${expected} for ${schemaName} serialization, received ${describeSchemaSerializeValue(value)}.`,
      expected,
      schema: schemaName,
      value,
    },
  ]);
}

export function validateSchemaInput<E extends ExpectedSchemaInputType>(
  input: SchemaInput,
  expected: E,
  schemaName: string,
): Result<E extends "string" ? string : SwXmlNode, SchemaError> {
  if (input === undefined) {
    return {
      success: false,
      error: createMissingRequiredFieldError(expected, schemaName),
    };
  }
  if (expected === "string" ? typeof input === "string" : isSwXmlNode(input)) {
    return { success: true, data: input as E extends "string" ? string : SwXmlNode };
  } else {
    return {
      success: false,
      error: new SchemaError([
        createSwXmlIssue("invalid_type", {
          message: `Expected ${expected === "string" ? "string" : "XML element"}, received ${describeSchemaInput(input)}.`,
          expected,
          value: input,
        }),
      ]),
    };
  }
}

export function describeSchemaInput(value: SchemaInput): string {
  if (value === undefined) return "undefined";
  if (typeof value === "string") return "string";
  if (isSwXmlNode(value)) return `<${value.tag}>`;
  return typeof value;
}

function describeSchemaSerializeValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function isSwXmlNode(value: SchemaInput): value is SwXmlNode {
  return typeof value === "object" && value !== null && "tag" in value && "attrs" in value;
}

export type DataSource = "attribute" | "child" | "failed";

/**
 * Shape をもとに属性や子要素をパースしてデータオブジェクトを作成
 */
export function parseShape<T extends Shape>(
  value: SwXmlNode,
  shape: T,
  ctx: SchemaParseContext,
  options?: SchemaParseOptions,
  prependPath: string[] = [],
) {
  const data: Record<string, unknown> = {};
  const dataSource: Record<string, DataSource> = {};
  const issues: AnySchemaIssue[] = [];

  for (const [key, schema] of Object.entries(shape)) {
    const result = schema.safeParseField(value, key, ctx, options);
    if (!result.success) {
      issues.push(...prependSchemaIssuePath(result.error, [...prependPath, key]).issues);
      dataSource[key] = "failed";
    } else if (!(schema instanceof OptionalSchema) || result.data !== undefined) {
      if (!("omitted" in result.data) || !result.data.omitted) {
        data[key] = result.data.value;
        dataSource[key] = result.data.source;
      }
    }
  }

  return {
    data: data as InferShape<T>,
    dataSource: dataSource as { [key in keyof T]: DataSource },
    issues,
  };
}

/**
 * itemTag, itemSchema をもとに子要素をリストアイテムとしてパースしてデータ配列を作成
 */
export function parseList<T>(
  value: SwXmlNodeList,
  itemTag: string,
  itemSchema: ElementSchema<T>,
  ctx: SchemaParseContext,
  options?: SchemaParseOptions,
  prependPath: string[] = [],
) {
  const items: T[] = [];
  const issues: AnySchemaIssue[] = [];

  for (const [index, child] of value.nodes.entries()) {
    if (child.tag !== itemTag) continue;

    const newCtx = extendSchemaParseContext(
      ctx,
      [{ index, tag: child.tag }],
      [...prependPath, index],
    );

    const result = itemSchema.safeParseValue(child, newCtx, options);
    if (!result.success) {
      issues.push(...prependSchemaIssuePath(result.error, [...prependPath, index]).issues);
    } else {
      items.push(result.data);
    }
  }

  return { items, issues };
}

/**
 * 未処理の属性・子要素を見つけて issues にまとめる
 */
export function checkUnknownFields(
  value: SwXmlNode,
  dataSource: Record<string, DataSource> | null,
  itemTag: string | null,
  ctx: SchemaParseContext,
  options?: SchemaParseOptions,
) {
  const issues: AnySchemaIssue[] = [];

  if (options?.unknownField === "ignore") return issues;

  for (const [key, attrValue] of value.attrs) {
    if (dataSource !== null) {
      const s = dataSource[key];
      if (s === "attribute" || s === "failed") continue;
    }

    const mode = evaluateUnknownFieldMode(
      { kind: "attribute", key, value: attrValue },
      ctx,
      options,
    );
    if (mode === "ignore") continue;

    issues.push(
      createSwXmlIssue("unknown_attribute", {
        message: `${dataSource !== null ? "Unknown attribute: " : "Expected no attribute, but got "}${key}="${escapeXmlAttribute(attrValue)}".`,
        key,
        value: attrValue,
      }),
    );
  }

  for (const [index, child] of value.nodes.entries()) {
    if (child.tag === itemTag) {
      continue;
    }
    if (dataSource !== null) {
      const s = dataSource[child.tag];
      if (s === "child" || s === "failed") continue;
    }

    const mode = evaluateUnknownFieldMode({ kind: "child", index, child }, ctx, options);
    if (mode === "ignore") continue;

    issues.push(
      createSwXmlIssue("unknown_child", {
        message: `Unknown child element: <${child.tag}>.`,
        child,
      }),
    );
  }

  return issues;
}

export function evaluateUnknownFieldMode(
  data: UnknownFieldData,
  ctx: SchemaParseContext,
  options?: SchemaParseOptions,
): UnknownFieldMode {
  if (typeof options?.unknownField === "function") {
    return options.unknownField(data, ctx);
  } else {
    return options?.unknownField ?? "error";
  }
}

export function evaluateDuplicateChildElementMode(
  data: DuplicateChildElementData,
  ctx: SchemaParseContext,
  options?: SchemaParseOptions,
): DuplicateChildElementMode {
  if (typeof options?.duplicateChildElement === "function") {
    return options.duplicateChildElement(data, ctx);
  } else {
    return options?.duplicateChildElement ?? "error";
  }
}

export function unwrapResult<T, E>(result: Result<T, E>): T {
  if (result.success) {
    return result.data;
  } else {
    throw result.error;
  }
}

function selectChild(
  nodeList: SwXmlNodeList,
  tag: string,
  ctx: SchemaParseContext,
  options?: SchemaParseOptions,
):
  | { kind: "ok"; value: SwXmlNode; siblingIndex: number }
  | { kind: "duplicate"; tag: string; candidates: SwXmlNode[] }
  | { kind: "missing" } {
  let selected: SwXmlNode;
  let siblingIndex: number;

  const candidates: SwXmlNode[] = [];
  let firstIndex = -1;
  let lastIndex = -1;
  for (const [index, child] of nodeList.nodes.entries()) {
    if (child.tag !== tag) continue;
    if (firstIndex === -1) firstIndex = index;
    lastIndex = index;
    candidates.push(child);
  }

  if (candidates.length === 0) {
    return { kind: "missing" };
  }

  if (candidates.length === 1) {
    selected = candidates[0]!;
    siblingIndex = firstIndex;
  } else {
    const mode = evaluateDuplicateChildElementMode({ tag, candidates }, ctx, options);
    if (mode === "first") {
      selected = candidates[0]!;
      siblingIndex = firstIndex;
    } else if (mode === "last") {
      selected = candidates[candidates.length - 1]!;
      siblingIndex = lastIndex;
    } else {
      return { kind: "duplicate", tag, candidates };
    }
  }

  return {
    kind: "ok",
    value: selected,
    siblingIndex,
  };
}

export function safeParseChild<T>(
  schema: Schema<T>,
  parent: SwXmlNodeList,
  key: string,
  ctx: SchemaParseContext,
  options?: SchemaParseOptions,
  prependPath: string[] = [],
): SchemaParseFieldChildResult<T> {
  const child = selectChild(parent, key, ctx, options);
  if (child.kind === "missing") {
    return {
      success: false,
      error: createMissingRequiredFieldError("xml_element", schema.name),
    };
  } else if (child.kind === "duplicate") {
    return {
      success: false,
      error: new SchemaError([
        createSwXmlIssue("duplicate_elements", {
          message: `Expected record of unique tags, got ${child.candidates.length} of <${child.tag}>.`,
        }),
      ]),
    };
  }

  const newCtx = extendSchemaParseContext(
    ctx,
    [{ index: child.siblingIndex, tag: key }],
    prependPath,
  );
  const r = schema.safeParseValue(child.value, newCtx, options);
  if (!r.success) return r;
  return {
    success: true,
    data: {
      value: r.data,
      source: "child",
    },
  };
}

export function safeParseTree<T>(
  schema: Schema<T>,
  tree: SwXmlNodeList | string | Uint8Array<ArrayBufferLike>,
  rootTag: string,
  options: SchemaParseOptions | undefined,
): Result<T, SchemaError> {
  if (!(tree instanceof SwXmlNodeList)) {
    tree = parseSwXml(tree);
  }

  const ctx = newSchemaParseContext(tree);
  const r = safeParseChild(schema, tree, rootTag, ctx, options);
  if (!r.success) {
    return r;
  } else {
    return {
      success: true,
      data: r.data.value,
    };
  }
}

export function serializeElement(
  serializeResult: ElementSchemaSerializeResult,
  rootTag: string,
  writer?: XmlWriter | XmlWriterOptions,
): XmlWriter {
  if (serializeResult.kind === "failed") {
    throw serializeResult.error;
  }

  if (!(writer instanceof XmlWriter)) {
    writer = new XmlWriter(writer);
  }

  serializeResult.write(rootTag, writer);
  return writer;
}
