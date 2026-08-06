import { XMLParser } from "fast-xml-parser";
import { isRecord, isStringRecord } from "@core";

// XMl のツリーを扱いやすく整形

export type RawXmlTreeValue = string | null | RawXmlTreeRecord | RawXmlTreeValue[];
export interface RawXmlTreeRecord extends Record<string, RawXmlTreeValue> {}

export class SwXmlNodeList {
  constructor(public nodes: SwXmlNode[]) {}

  // list として使う (全要素が同じタグ名であることを期待)
  asNodeList(): SwXmlNode[] {
    const tags = new Set(this.nodes.map((c) => c.tag));
    if (tags.size > 1) {
      throw new Error(`Expected list of the same tags, got tags: ${[...tags]}`);
    }
    return this.nodes;
  }

  // record として使う (タグ名で一意に引ける)
  child(tag: string): SwXmlNode | undefined {
    const matches = this.nodes.filter((c) => c.tag === tag);
    if (matches.length > 1) {
      throw new Error(`Expected record of unique tags, got ${matches.length} of <${tag}>`);
    }
    return matches[0];
  }

  // 同名要素がないはずなのに複数ある場合エラーにならず最後のものを取得する (getChild でどうしてもエラーになるときの回避用、基本は getChild の使用を推奨)
  lastChild(tag: string): SwXmlNode | undefined {
    return this.nodes.findLast((c) => c.tag === tag);
  }

  childTags(): string[] {
    return [...new Set(this.nodes.map((c) => c.tag))];
  }

  getRawTree(tag: string, strict = true): RawXmlTreeValue | undefined {
    const c = this.child(tag);
    if (!c) return;
    return c.asRawTree(strict);
  }
}

export class SwXmlNode extends SwXmlNodeList {
  constructor(
    readonly tag: string,
    readonly attrs: Map<string, string>,
    children: SwXmlNode[],
  ) {
    super(children);
  }

  attr(name: string): string | undefined {
    return this.attrs.get(name);
  }

  setAttr(name: string, value: string): void {
    this.attrs.set(name, value);
  }

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

  asRawTreeList(strict = true): RawXmlTreeValue[] {
    return this.asNodeList().map((c) => c.asRawTree(strict));
  }

  asRawTree(strict = true): RawXmlTreeValue {
    const uniqueChildTags = this.childTags().length;
    if (this.attrs.size === 0 && uniqueChildTags === 0) return null;

    if (uniqueChildTags >= 2 || this.attrs.size > 0) {
      if (uniqueChildTags === this.nodes.length) {
        return this.asRawTreeRecord(strict);
      } else {
        throw new Error(`Cannot determine whether <${this.tag}> is a record or a list.`);
      }
    } else {
      return this.asRawTreeList(strict);
    }
  }
}

function formatXmlElement(value: unknown): SwXmlNode | null {
  if (!isRecord(value)) throw new TypeError("Unexpected error occured while parsing XML.");

  if ("#text" in value) return null;

  const dynamicKeys = Object.keys(value).filter((k) => k !== ":@");
  if (dynamicKeys.length !== 1) throw new TypeError("Unexpected error occured while parsing XML.");

  const name = dynamicKeys[0]!;

  const attributes = value[":@"] ?? {};
  if (!isStringRecord(attributes))
    throw new TypeError("Unexpected error occured while parsing XML.");

  const rawChildren = value[name] ?? [];
  if (!Array.isArray(rawChildren))
    throw new TypeError("Unexpected error occured while parsing XML.");

  const children = formatSwXmlElements(rawChildren);

  return new SwXmlNode(name, new Map(Object.entries(attributes)), children);
}

function formatSwXmlElements(value: unknown): SwXmlNode[] {
  if (!Array.isArray(value)) throw new TypeError("Unexpected error occured while parsing XML.");

  return value.map(formatXmlElement).filter((v) => v !== null);
}

const parser = new XMLParser({
  ignoreDeclaration: true,
  ignoreAttributes: false,
  preserveOrder: true,
  attributeNamePrefix: "",
});

// Stormworks 用の XML ではテキストノードは出現しないため無視してツリーを構築
export function parseSwXml(input: string | Uint8Array<ArrayBufferLike>): SwXmlNodeList {
  return new SwXmlNodeList(formatSwXmlElements(parser.parse(input)));
}
