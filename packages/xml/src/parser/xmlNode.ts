import { SwXmlStructureError } from "./errors";

/**
 * How to resolve duplicate child elements when reading an XML record.
 */
export type DuplicateChildElementMode = "error" | "last" | "first";

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
      throw new SwXmlStructureError(
        "invalid_list_shape",
        `Expected list of the same tags, got tags: ${[...tags]}`,
        { childTags: [...tags] },
      );
    }
    return this.nodes;
  }

  /**
   * Returns the number of child node. If a tag name is given, only children that have the same tag name counts.
   */
  countChild(tag?: string): number {
    if (tag !== undefined) {
      let count = 0;
      for (const child of this.nodes) {
        if (child.tag === tag) {
          count++;
        }
      }
      return count;
    } else {
      return this.nodes.length;
    }
  }

  /**
   * Returns a unique child node and its index by tag name.
   */
  child(tag: string): { index: number; value: SwXmlNode } | undefined {
    const matches = this.nodes
      .map((value, index) => (value.tag === tag ? { index, value } : null))
      .filter((v) => v !== null);
    if (matches.length > 1) {
      throw new SwXmlStructureError(
        "duplicate_child_element",
        `Expected record of unique tags, got ${matches.length} of <${tag}>.`,
        { childTag: tag },
      );
    }
    return matches[0];
  }

  /**
   * Returns the first child node and its index with the given tag name.
   */
  firstChild(tag: string): { index: number; value: SwXmlNode } | undefined {
    const index = this.nodes.findIndex((c) => c.tag === tag);
    if (index === -1) {
      return;
    }
    return { index, value: this.nodes[index]! };
  }

  /**
   * Returns the last child node and its index with the given tag name.
   */
  lastChild(tag: string): { index: number; value: SwXmlNode } | undefined {
    const index = this.nodes.findLastIndex((c) => c.tag === tag);
    if (index === -1) {
      return;
    }
    return { index, value: this.nodes[index]! };
  }

  /**
   * Selects one child node by tag name.
   *
   * By default, duplicate child elements are treated as an error. Pass "first"
   * or "last" to tolerate duplicates and choose the corresponding child.
   */
  selectChild(
    tag: string,
    duplicateChildElement?: DuplicateChildElementMode,
  ): { index: number; value: SwXmlNode } | undefined {
    if (duplicateChildElement === "first") return this.firstChild(tag);
    if (duplicateChildElement === "last") return this.lastChild(tag);
    return this.child(tag);
  }

  /**
   * Returns the unique child tag names in this node list.
   */
  childTags(): string[] {
    return [...new Set(this.nodes.map((c) => c.tag))];
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
}
