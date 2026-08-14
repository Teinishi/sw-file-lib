import {
  SchemaError,
  type SchemaInput,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaIssue,
  type SchemaIssueBase,
  type SchemaIssueMap,
  type UnknownFieldCallback,
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
} from "..";
import {
  parseSwXml,
  SwXmlNode,
  SwXmlNodeList,
  SwXmlStructureError,
  type DuplicateChildElementMode,
} from "../../parser";
import { escapeXmlAttribute, XmlWriter, type XmlWriterOptions } from "../../writer/XmlWriter";

export function newSchemaParseContext(root: SwXmlNodeList): SchemaParseContext {
  return {
    xmlPath: [],
    root,
    node: undefined,
    schemaPath: [],
  };
}

export function extendSchemaParseContext(
  ctx: SchemaParseContext,
  extendXmlPath: SwXmlPath,
  extendSchemaPath: SchemaPath,
): SchemaParseContext {
  let node = ctx.node;
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
    node,
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
      ctx,
      { kind: "attribute", key, value: attrValue },
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

    const mode = evaluateUnknownFieldMode(ctx, { kind: "child", index, child }, options);
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
  ctx: SchemaParseContext,
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
  ctx: SchemaParseContext,
  target: string,
  options?: SchemaParseOptions,
): DuplicateChildElementMode {
  if (typeof options?.duplicateChildElement === "function") {
    return options.duplicateChildElement(ctx, target);
  } else {
    return options?.duplicateChildElement ?? "error";
  }
}

export function selectChild(
  nodeList: SwXmlNodeList,
  tag: string,
  ctx: SchemaParseContext,
  options?: SchemaParseOptions,
): { value: SwXmlNode; siblingIndex: number } | undefined {
  let result;

  try {
    if (nodeList.countChild(tag) === 1) {
      result = nodeList.child(tag);
    } else {
      const mode = evaluateDuplicateChildElementMode(ctx, tag, options);
      result = nodeList.selectChild(tag, mode);
    }
  } catch (e) {
    if (e instanceof SwXmlStructureError) {
      throw new SchemaError([
        createSwXmlIssue("structure_error", {
          message: e.message,
          structureError: e,
        }),
      ]);
    }
    throw e;
  }

  if (!result) return;

  return {
    value: result.value,
    siblingIndex: result.index,
  };
}

export function unwrapResult<T, E>(result: Result<T, E>): T {
  if (result.success) {
    return result.data;
  } else {
    throw result.error;
  }
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
  if (child === undefined) {
    return {
      success: false,
      error: createMissingRequiredFieldError("xml_element", schema.name),
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
    throw new Error("todo: error message");
  }

  if (!(writer instanceof XmlWriter)) {
    writer = new XmlWriter(writer);
  }

  serializeResult.write(rootTag, writer);
  return writer;
}
