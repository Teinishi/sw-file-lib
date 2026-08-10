import { SwXmlNode, SwXmlStructureError, type SwXmlNodeList } from "../parser";
import { SchemaError } from "./errors";
import { createSwXmlIssue, evaluateDuplicateChildElementMode } from "./internal";
import {
  newSchemaParseContext,
  type Schema,
  type SchemaParseContext,
  type SchemaParseOptions,
  type SchemaSafeParseResult,
} from "./types";

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
    newCtx: {
      ...ctx,
      xmlPath: ctx.xmlPath.concat({ index: result.index, tag }),
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
    if (error instanceof SchemaError) {
      return { success: false, error };
    }
    throw error;
  }
}
