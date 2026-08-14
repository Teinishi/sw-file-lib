import { XMLParser } from "fast-xml-parser";
import { isRecord, isStringRecord } from "@sw-file-lib/core";
import { SwXmlParseError } from "./errors";
import { SwXmlNode, SwXmlNodeList } from "./xmlNode";

export * from "./errors";
export * from "./rawTree";
export * from "./xmlNode";

/**
 * How to resolve duplicate child elements when reading an XML record.
 */
export type DuplicateChildElementMode = "error" | "last" | "first";

function formatXmlElement(value: unknown): SwXmlNode | null {
  if (!isRecord(value)) {
    throw new SwXmlParseError(
      "invalid_parser_output",
      "Expected an XML parser element output object.",
    );
  }

  if ("#text" in value) return null;

  const dynamicKeys = Object.keys(value).filter((k) => k !== ":@");
  if (dynamicKeys.length !== 1) {
    throw new SwXmlParseError(
      "invalid_parser_output",
      "Expected an XML parser element output object with one element key.",
    );
  }

  const name = dynamicKeys[0]!;

  const attributes = value[":@"] ?? {};
  if (!isStringRecord(attributes)) {
    throw new SwXmlParseError(
      "invalid_attribute_output",
      "Expected XML parser attribute output to be a string record.",
    );
  }

  const rawChildren = value[name] ?? [];
  if (!Array.isArray(rawChildren)) {
    throw new SwXmlParseError(
      "invalid_child_output",
      "Expected XML parser child output to be an array.",
    );
  }

  const children = formatSwXmlElements(rawChildren);

  return new SwXmlNode(name, new Map(Object.entries(attributes)), children);
}

function formatSwXmlElements(value: unknown): SwXmlNode[] {
  if (!Array.isArray(value)) {
    throw new SwXmlParseError(
      "invalid_parser_output",
      "Expected XML parser output to be an array.",
    );
  }

  return value.map(formatXmlElement).filter((v) => v !== null);
}

const parser = new XMLParser({
  ignoreDeclaration: true,
  ignoreAttributes: false,
  preserveOrder: true,
  attributeNamePrefix: "",
});

/**
 * Parses a Stormworks XML document into a node tree.
 */
export function parseSwXml(input: string | Uint8Array<ArrayBufferLike>): SwXmlNodeList {
  try {
    return new SwXmlNodeList(formatSwXmlElements(parser.parse(input)));
  } catch (error) {
    if (error instanceof SwXmlParseError) {
      throw error;
    }
    throw new SwXmlParseError("invalid_xml", "Failed to parse XML.", { cause: error });
  }
}
