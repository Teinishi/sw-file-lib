import { isRecord, isStringRecord } from "@core";
import { XMLParser } from "fast-xml-parser";
import { SwXmlNode, SwXmlNodeList } from "./xmlNode";

export * from "./rawTree";
export * from "./xmlNode";

/**
 * How to resolve duplicate child elements when reading an XML record.
 */
export type DuplicateChildElementMode = "error" | "last" | "first";

function formatXmlElement(value: unknown): SwXmlNode | null {
  if (!isRecord(value)) throw new TypeError("Unexpected error occurred while parsing XML.");

  if ("#text" in value) return null;

  const dynamicKeys = Object.keys(value).filter((k) => k !== ":@");
  if (dynamicKeys.length !== 1) throw new TypeError("Unexpected error occurred while parsing XML.");

  const name = dynamicKeys[0]!;

  const attributes = value[":@"] ?? {};
  if (!isStringRecord(attributes))
    throw new TypeError("Unexpected error occurred while parsing XML.");

  const rawChildren = value[name] ?? [];
  if (!Array.isArray(rawChildren))
    throw new TypeError("Unexpected error occurred while parsing XML.");

  const children = formatSwXmlElements(rawChildren);

  return new SwXmlNode(name, new Map(Object.entries(attributes)), children);
}

function formatSwXmlElements(value: unknown): SwXmlNode[] {
  if (!Array.isArray(value)) throw new TypeError("Unexpected error occurred while parsing XML.");

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
  return new SwXmlNodeList(formatSwXmlElements(parser.parse(input)));
}
