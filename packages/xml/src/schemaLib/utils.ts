import {
  SwXmlNode,
  SwXmlStructureError,
  type DuplicateChildElementMode,
  type SwXmlNodeList,
} from "../parser";
import { createSwXmlIssue, SwXmlSchemaError } from "./errors";
import {
  newSchemaParseContext,
  type Schema,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
} from "./types";

export function evaluateDuplicateChildElementMode(
  tag: string,
  ctx: SchemaParseContext = newSchemaParseContext(),
  options?: SchemaParseOptions,
): DuplicateChildElementMode {
  if (typeof options?.duplicateChildElement === "function") {
    return options.duplicateChildElement(ctx, tag);
  } else {
    return options?.duplicateChildElement ?? "error";
  }
}

export function selectChild(
  nodeList: SwXmlNodeList,
  tag: string,
  ctx: SchemaParseContext = newSchemaParseContext(),
  options?: SchemaParseOptions,
):
  | {
      value: SwXmlNode;
      newCtx: SchemaParseContext;
    }
  | undefined {
  const mode = evaluateDuplicateChildElementMode(tag, ctx, options);

  let result;
  try {
    result = nodeList.selectChild(tag, mode);
  } catch (e) {
    if (e instanceof SwXmlStructureError) {
      throw new SwXmlSchemaError([
        createSwXmlIssue({
          code: "structure_error",
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
    newCtx: {
      ...ctx,
      path: ctx.path.concat({ index: result.index, tag }),
    },
  };
}

export function parseTree<T>(
  schema: Schema<T>,
  tree: SwXmlNodeList,
  rootTag: string,
  options?: SchemaParseOptions,
): T {
  return schema.parseField(tree, rootTag, newSchemaParseContext(), options);
}

export function safeParseTree<T>(
  schema: Schema<T>,
  tree: SwXmlNodeList,
  rootTag: string,
  options?: SchemaParseOptions,
): SchemaSafeParseResult<T> {
  try {
    return {
      success: true,
      data: schema.parseField(tree, rootTag, newSchemaParseContext(), options),
    };
  } catch (error) {
    if (error instanceof SwXmlSchemaError) {
      return { success: false, error };
    }
    throw error;
  }
}
