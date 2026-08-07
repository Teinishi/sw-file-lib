import { isRecord, isStringRecord } from "@core";
import { XMLParser } from "fast-xml-parser";

/**
 * A raw XML value after normalizing Stormworks list and record elements.
 */
export type RawXmlTreeValue = string | null | RawXmlTreeRecord | RawXmlTreeList;

/**
 * A raw XML record where attributes and unique child elements are represented as fields.
 */
export interface RawXmlTreeRecord extends Record<string, RawXmlTreeValue> {}

/**
 * A raw XML list whose items originally shared the same XML tag name.
 */
export class RawXmlTreeList {
  constructor(
    readonly itemTag: string,
    readonly items: RawXmlTreeValue[],
  ) {}

  /**
   * Maps each raw list item.
   */
  map<U>(fn: (v: RawXmlTreeValue) => U): U[] {
    return this.items.map(fn);
  }

  [Symbol.iterator]() {
    return this.items[Symbol.iterator]();
  }
}

/**
 * A list of parsed Stormworks XML nodes.
 */
export class SwXmlNodeList {
  constructor(public nodes: SwXmlNode[]) {}

  /**
   * Returns the nodes as a list and requires all child tags to be the same.
   */
  asNodeList(): SwXmlNode[] {
    const tags = new Set(this.nodes.map((c) => c.tag));
    if (tags.size > 1) {
      throw new Error(`Expected list of the same tags, got tags: ${[...tags]}`);
    }
    return this.nodes;
  }

  /**
   * Returns a unique child node by tag name.
   */
  child(tag: string): SwXmlNode | undefined {
    const matches = this.nodes.filter((c) => c.tag === tag);
    if (matches.length > 1) {
      throw new Error(`Expected record of unique tags, got ${matches.length} of <${tag}>`);
    }
    return matches[0];
  }

  /**
   * Returns the last child node with the given tag name.
   */
  lastChild(tag: string): SwXmlNode | undefined {
    return this.nodes.findLast((c) => c.tag === tag);
  }

  /**
   * Returns the unique child tag names in this node list.
   */
  childTags(): string[] {
    return [...new Set(this.nodes.map((c) => c.tag))];
  }

  /**
   * Returns a child node converted to a raw XML tree value.
   */
  getRawTree(tag: string, strict = true): RawXmlTreeValue | undefined {
    const c = this.child(tag);
    if (!c) return;
    return c.asRawTree(strict);
  }
}

/**
 * A parsed Stormworks XML element.
 */
export class SwXmlNode extends SwXmlNodeList {
  constructor(
    readonly tag: string,
    readonly attrs: Map<string, string>,
    children: SwXmlNode[],
  ) {
    super(children);
  }

  /**
   * Returns an attribute value by name.
   */
  attr(name: string): string | undefined {
    return this.attrs.get(name);
  }

  /**
   * Sets an attribute value by name.
   */
  setAttr(name: string, value: string): void {
    this.attrs.set(name, value);
  }

  /**
   * Converts this node to a raw XML record.
   */
  asRawTreeRecord(strict = true): RawXmlTreeRecord {
    const obj: RawXmlTreeRecord = Object.fromEntries(this.attrs.entries());
    for (const child of this.nodes) {
      if (strict && child.tag in obj) {
        throw new Error(`Expected record of unique tags, got more than one of <${child.tag}>`);
      }
      const c = child.asRawTree(strict);
      obj[child.tag] = c;
    }
    return obj;
  }

  /**
   * Converts this node to a raw XML list.
   */
  asRawTreeList(strict = true): RawXmlTreeList {
    if (this.childTags().length !== 1) {
      throw new Error(
        `Expected list of single tags at <${this.tag}>, got zero or multiple child tags: <${this.childTags().join(">, <")}>`,
      );
    }
    const nodeList = this.asNodeList();
    const itemTag = nodeList[0]?.tag;
    if (itemTag === undefined)
      throw new Error(`Expected list of single tags, got none at <${this.tag}>`);
    return new RawXmlTreeList(
      itemTag,
      nodeList.map((c) => c.asRawTree(strict)),
    );
  }

  /**
   * Converts this node to a raw XML tree value.
   */
  asRawTree(strict = true): RawXmlTreeValue {
    const hasNoAttr = this.attrs.size === 0;
    const uniqueItemTags = this.childTags().length;

    if (this.attrs.size === 0 && uniqueItemTags === 0) return null;

    if (uniqueItemTags === 1 && hasNoAttr) {
      return this.asRawTreeList(strict);
    } else if (uniqueItemTags >= 2 || !hasNoAttr) {
      return this.asRawTreeRecord(strict);
    } else if (hasNoAttr && uniqueItemTags === 0) {
      return null;
    } else {
      throw new Error(`Cannot determine whether <${this.tag}> is a record or a list.`);
    }
  }
}

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
