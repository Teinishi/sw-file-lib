import { XMLParser } from "fast-xml-parser";
import { isRecord, isStringRecord } from "@internalUtils";

// fast-xml-parser をそのまま使うと型が変なので整形

export interface XmlElement {
  name: string;
  attributes: Record<string, string>;
  children: XmlElement[];
}

function parseXmlElement(value: unknown): XmlElement {
  if (!isRecord(value)) throw new TypeError("Unexpected error occured while parsing XML.");

  const dynamicKeys = Object.keys(value).filter((k) => k !== ":@");
  if (dynamicKeys.length !== 1) throw new TypeError("Unexpected error occured while parsing XML.");

  const name = dynamicKeys[0];

  const attributes = value[":@"] ?? {};
  if (!isStringRecord(attributes))
    throw new TypeError("Unexpected error occured while parsing XML.");

  const rawChildren = value[name] ?? [];
  if (!Array.isArray(rawChildren))
    throw new TypeError("Unexpected error occured while parsing XML.");

  const children = rawChildren.map(parseXmlElement);

  return {
    name,
    attributes,
    children,
  };
}

const parser = new XMLParser({
  ignoreDeclaration: true,
  ignoreAttributes: false,
  preserveOrder: true,
  attributeNamePrefix: "",
});

export function parseXml(input: string | Uint8Array<ArrayBufferLike>): XmlElement[] {
  const raw = parser.parse(input);

  if (!Array.isArray(raw)) throw new TypeError("Unexpected error occured while parsing XML.");

  return raw.map(parseXmlElement);
}

export function getElementList(elements: XmlElement[], name: string): XmlElement[] {
  const filtered = elements.filter((el) => el.name === name);
  if (filtered.length >= 2)
    throw new Error(`One or zero instance of "${name}" expected, but found two or more.`);
  if (filtered.length == 0) return [];
  return filtered[0].children;
}

export function getSingletonByName<T extends { name: PropertyKey }, N extends T["name"]>(
  items: readonly T[],
  name: N,
): Extract<T, { name: N }> {
  const matched = items.filter((item): item is Extract<T, { name: N }> => item.name === name);

  if (matched.length !== 1)
    throw new Error(`Expected exactly one "${String(name)}", but found ${matched.length}`);

  return matched[0];
}

export function getSingletonByNameOptional<T extends { name: PropertyKey }, N extends T["name"]>(
  items: readonly T[],
  name: N,
): Extract<T, { name: N }> | undefined {
  const matched = items.filter((item): item is Extract<T, { name: N }> => item.name === name);

  if (matched.length === 0) return;

  if (matched.length !== 1)
    throw new Error(`Expected exactly one "${String(name)}", but found ${matched.length}`);

  return matched[0];
}
