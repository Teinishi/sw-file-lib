/**
 * Value types that can be used as XML attribute values.
 */
export type XmlAttributeValue = string | number | boolean | undefined;

/**
 * An iterable of key-value pairs representing XML attributes.
 *
 * Used by {@link XmlWriter} when writing XML elements with attributes.
 */
export type XmlAttributes = Iterable<readonly [string, XmlAttributeValue]>;

/**
 * Options for configuring the behavior of an {@link XmlWriter} instance.
 */
export interface XmlWriterOptions {
  /**
   * The string or number of spaces to use for indentation in the generated XML output.
   *
   * If a string is provided, it will be used as the indentation for each level of nesting.
   * If a number is provided, that many spaces will be used for each level of nesting.
   * If `undefined`, the output code will not be indented and will be a single line.
   *
   * @default `undefined`
   */
  readonly indent?: string | number | undefined;

  /**
   * Whether to include the XML declaration (`<?xml version="1.0" encoding="UTF-8"?>`) at the beginning of the output.
   *
   * @default `true`
   */
  readonly xmlDeclaration?: boolean;
}

function getIndent(indent: string | number | undefined): string | undefined {
  if (typeof indent === "string") {
    return indent;
  } else if (typeof indent === "number") {
    return " ".repeat(indent);
  }
}

/**
 * A utility class for generating XML content programmatically.
 *
 * @example
 * ```ts
 * const writer = new XmlWriter({ indent: 2 });
 * writer.begin("root");
 * writer.element("child", { attr: "value" }, (w) => {
 *   w.comment("This is a comment");
 * });
 * writer.end("root");
 * console.log(writer.toString());
 * ```
 *
 * @see {@link XmlWriterOptions} for configuration options.
 */
export class XmlWriter {
  private readonly lines: string[] = [];
  private readonly indentString: string | undefined;
  private readonly elementStack: string[] = [];

  constructor(options?: XmlWriterOptions) {
    this.indentString = getIndent(options?.indent);

    if (options?.xmlDeclaration ?? true) {
      this.lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    }
  }

  /**
   * Begin an XML element with the specified name and optional attributes.
   *
   * @param name The name of the XML element to begin.
   * @param attributes Attributes for the XML element.
   */
  begin(name: string, attributes?: XmlAttributes): void {
    this.writeLine(`<${name}${this.formatAttributes(attributes)}>`);
    this.elementStack.push(name);
  }

  /**
   * Close the most recently opened XML element with the specified name.
   * @param name The name of the XML element to close.
   *
   * @throws An error if the closing tag does not match the most recently opened element.
   */
  end(name: string): void {
    const expected = this.elementStack.pop();

    if (expected === undefined) {
      throw new Error(`Unexpected </${name}>: no element is currently open.`);
    }

    if (expected !== name) {
      throw new Error(`Mismatched closing tag: expected </${expected}> but got </${name}>.`);
    }

    this.writeLine(`</${name}>`);
  }

  /**
   * Create an empty XML element with the specified name and optional attributes.
   *
   * @param name The name of the XML element to create.
   * @param attributes Attributes for the XML element.
   */
  empty(name: string, attributes?: XmlAttributes): void {
    this.writeLine(`<${name}${this.formatAttributes(attributes)}/>`);
  }

  /**
   * Create an XML element with the specified name, attributes, and child elements.
   *
   * @param name The name of the XML element to create.
   * @param attributes Attributes for the XML element.
   * @param children A function that takes a `XmlWriter` instance and writes child elements to it.
   *
   * @example
   * ```ts
   * writer.element("parent", { attr: "value" }, (w) => {
   *   w.empty("child", { childAttr: "childValue" });
   * });
   * ```
   */
  element(
    name: string,
    attributes: XmlAttributes | undefined,
    children: (writer: XmlWriter) => void,
  ) {
    const childrenWriter = new XmlWriter({
      indent: this.indentString,
      xmlDeclaration: false,
    });
    children(childrenWriter);
    if (childrenWriter.lines.length === 0) {
      this.empty(name, attributes);
    } else {
      this.begin(name, attributes);
      for (const line of childrenWriter.lines) {
        this.writeLine(line);
      }
      this.end(name);
    }
  }

  /**
   * Add a comment to the XML output.
   * @param text The text of the comment to add.
   */
  comment(text: string): void {
    this.writeLine(`<!-- ${text} -->`);
  }

  /**
   * Generate the final XML string from the written elements.
   *
   * @throws An error if there are unclosed elements when this method is called.
   */
  toString(): string {
    if (this.elementStack.length > 0) {
      throw new Error(`Unclosed element(s): ${this.elementStack.join(" -> ")}`);
    }

    return this.lines.concat("").join(this.indentString !== undefined ? "\n" : "");
  }

  private writeLine(line: string): void {
    if (this.indentString === undefined) {
      this.lines.push(line);
    } else {
      this.lines.push(this.indentString.repeat(this.elementStack.length) + line);
    }
  }

  private formatAttributes(attributes?: XmlAttributes): string {
    if (!attributes) return "";

    let s = "";
    for (const [name, value] of attributes) {
      if (value === undefined) continue;
      s += ` ${name}="${escapeXmlAttribute(String(value))}"`;
    }
    return s;
  }
}

/**
 * Escape special characters in a string for use in XML attribute values.
 *
 * The characters `&`, `<`, `>`, and `"` are replaced with their corresponding XML entities.
 *
 * @param value The string to escape.
 * @returns The escaped string.
 */
export function escapeXmlAttribute(value: string): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
