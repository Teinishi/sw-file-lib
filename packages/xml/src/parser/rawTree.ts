/**
 * A raw XML value after normalizing Stormworks list and record elements.
 *
 * This representation is provided as a convenience utility for ad-hoc
 * inspection. Prefer schema parsing for library and application code, because
 * some Stormworks XML elements can only be interpreted correctly with schema
 * context.
 */
export type RawXmlTreeValue = string | null | RawXmlTreeRecord | RawXmlTreeList;

/**
 * A raw XML record where attributes and unique child elements are represented as fields.
 *
 * Prefer schema parsing when you need reliable typed data. This utility format
 * intentionally trades some XML structure for a simpler JavaScript object.
 */
export interface RawXmlTreeRecord extends Record<string, RawXmlTreeValue> {}

/**
 * A raw XML list whose items originally shared the same XML tag name.
 *
 * Prefer schema parsing when the element could be either a list container or a
 * record with a single child element.
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
