import { createSwXmlIssue, SwXmlSchemaError, type SchemaParseOptions } from "..";
import { SwXmlStructureError, type SwXmlNode } from "../../parser";

export function schemaSelectChild(parent: SwXmlNode, key: string, options?: SchemaParseOptions) {
  try {
    return parent.selectChild(key, options?.duplicateChildElement);
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
}
