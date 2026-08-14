import {
  RawXmlTreeList,
  type DuplicateChildElementMode,
  type RawXmlTreeRecord,
  type RawXmlTreeValue,
} from ".";
import { SwXmlStructureError } from "./errors";

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

  /**
   * Returns a child node converted to a raw XML tree value.
   *
   * This is useful for quick inspection, but schema parsing is preferred for
   * tools that need reliable behavior across Stormworks XML edge cases.
   */
  getRawTree(
    tag: string,
    duplicateChildElement: DuplicateChildElementMode = "error",
  ): RawXmlTreeValue | undefined {
    const c = this.selectChild(tag, duplicateChildElement);
    if (!c) return;
    return c.value.asRawTree(duplicateChildElement);
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
  asRawTreeRecord(duplicateChildElement: DuplicateChildElementMode = "error"): RawXmlTreeRecord {
    const obj: RawXmlTreeRecord = Object.fromEntries(this.attrs.entries());
    for (const child of this.nodes) {
      if (child.tag in obj) {
        if (duplicateChildElement === "error") {
          throw new SwXmlStructureError(
            "duplicate_child_element",
            `Expected record of unique tags, got more than one of <${child.tag}>.`,
            {
              tag: this.tag,
              childTag: child.tag,
            },
          );
        }
        if (duplicateChildElement === "first") {
          continue;
        }
      }
      const c = child.asRawTree(duplicateChildElement);
      obj[child.tag] = c;
    }
    return obj;
  }

  /**
   * Converts this node to a raw XML list.
   *
   * Prefer schema parsing when the expected shape is known.
   */
  asRawTreeList(duplicateChildElement: DuplicateChildElementMode = "error"): RawXmlTreeList {
    const childTags = this.childTags();
    if (childTags.length === 0) {
      throw new SwXmlStructureError(
        "empty_list",
        `Expected list of single tags, got none at <${this.tag}>.`,
        { tag: this.tag },
      );
    }
    if (childTags.length !== 1) {
      throw new SwXmlStructureError(
        "invalid_list_shape",
        `Expected list of single tags at <${this.tag}>, got multiple child tags: <${childTags.join(">, <")}>`,
        {
          tag: this.tag,
          childTags,
        },
      );
    }
    const nodeList = this.asNodeList();
    const itemTag = nodeList[0]?.tag;
    if (itemTag === undefined) {
      throw new SwXmlStructureError(
        "empty_list",
        `Expected list of single tags, got none at <${this.tag}>.`,
        { tag: this.tag },
      );
    }
    return new RawXmlTreeList(
      itemTag,
      nodeList.map((c) => c.asRawTree(duplicateChildElement)),
    );
  }

  /**
   * Converts this node to a raw XML tree value.
   *
   * This schema-free conversion is convenient, but it can misclassify elements
   * whose list or record shape depends on the schema. Prefer schema parsing for
   * CLI and GUI tools.
   */
  asRawTree(duplicateChildElement: DuplicateChildElementMode = "error"): RawXmlTreeValue {
    const hasNoAttr = this.attrs.size === 0;
    const uniqueItemTags = this.childTags().length;

    if (this.attrs.size === 0 && uniqueItemTags === 0) return null;

    if (uniqueItemTags === 1 && hasNoAttr) {
      return this.asRawTreeList(duplicateChildElement);
    } else if (uniqueItemTags >= 2 || !hasNoAttr) {
      return this.asRawTreeRecord(duplicateChildElement);
    } else if (hasNoAttr && uniqueItemTags === 0) {
      return null;
    } else {
      throw new SwXmlStructureError(
        "unknown_node_shape",
        `Cannot determine whether <${this.tag}> is a record or a list.`,
        { tag: this.tag },
      );
    }
  }
}
