import {
  RawXmlTreeList,
  type DuplicateChildElementMode,
  type RawXmlTreeRecord,
  type RawXmlTreeValue,
} from ".";

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
   * Returns the first child node with the given tag name.
   */
  firstChild(tag: string): SwXmlNode | undefined {
    return this.nodes.find((c) => c.tag === tag);
  }

  /**
   * Returns the last child node with the given tag name.
   */
  lastChild(tag: string): SwXmlNode | undefined {
    return this.nodes.findLast((c) => c.tag === tag);
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
  ): SwXmlNode | undefined {
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

  /**
   * Returns a child node converted to a raw XML tree value.
   *
   * This is useful for quick inspection, but schema parsing is preferred for
   * tools that need reliable behavior across Stormworks XML edge cases.
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
   *
   * Prefer schema parsing for typed library and application code.
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
   *
   * Prefer schema parsing when the expected shape is known.
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
   *
   * This schema-free conversion is convenient, but it can misclassify elements
   * whose list or record shape depends on the schema. Prefer schema parsing for
   * CLI and GUI tools.
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
