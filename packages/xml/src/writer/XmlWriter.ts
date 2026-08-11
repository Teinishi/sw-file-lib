import type { DeepReadonly } from "ts-essentials";

export type XmlAttributeValue = string | number | boolean | undefined;
export type XmlAttributes = Iterable<readonly [string, XmlAttributeValue]>;

export interface XmlWriterOptions {
  indentString?: string;
  pretty?: boolean;
  xmlDeclaration?: boolean;
}

export class XmlWriter {
  private readonly lines: string[] = [];
  private readonly indentString;
  private readonly pretty;
  private readonly elementStack: string[] = [];

  constructor(options?: XmlWriterOptions) {
    this.indentString = options?.indentString ?? "  ";
    this.pretty = options?.pretty ?? false;

    if (options?.xmlDeclaration ?? true) {
      this.lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    }
  }

  begin(name: string, attributes?: DeepReadonly<XmlAttributes>): void {
    this.writeLine(`<${name}${this.formatAttributes(attributes)}>`);
    this.elementStack.push(name);
  }

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

  empty(name: string, attributes?: DeepReadonly<XmlAttributes>): void {
    this.writeLine(`<${name}${this.formatAttributes(attributes)}/>`);
  }

  element(
    name: string,
    attributes: DeepReadonly<XmlAttributes> | undefined,
    children: (writer: XmlWriter) => void,
  ) {
    const childrenWriter = new XmlWriter({
      indentString: this.indentString,
      pretty: this.pretty,
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

  comment(text: string): void {
    this.writeLine(`<!-- ${text} -->`);
  }

  toString(): string {
    if (this.elementStack.length > 0) {
      throw new Error(`Unclosed element(s): ${this.elementStack.join(" -> ")}`);
    }

    return this.lines.concat("").join(this.pretty ? "\n" : "");
  }

  private writeLine(line: string): void {
    if (!this.pretty) {
      this.lines.push(line);
    } else {
      this.lines.push(this.indentString.repeat(this.elementStack.length) + line);
    }
  }

  private formatAttributes(attributes?: DeepReadonly<XmlAttributes>): string {
    if (!attributes) return "";

    let s = "";
    for (const [name, value] of attributes) {
      if (value === undefined) continue;
      s += ` ${name}="${escapeXmlAttribute(String(value))}"`;
    }
    return s;
  }
}

export function escapeXmlAttribute(value: string): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
