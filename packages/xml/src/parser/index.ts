import { XMLParser } from "fast-xml-parser";
import { isRecord, isStringRecord } from "../internal";
import * as x from "../xml-schema"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { SwXmlParseError } from "./errors";
import { SwXmlNode, SwXmlNodeList } from "./xmlNode";

export * from "./errors";
export * from "./xmlNode";

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
 *
 * Intended for internal use. Most applications never need it, but it can
 * improve performance when parsing XML with multiple root elements by calling
 * `parseSwXml()` only once and passing to {@link x.ElementSchema.parse} or {@link x.ElementSchema.safeParse}.
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
