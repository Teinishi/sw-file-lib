import * as ts from "typescript";

const MARKER_PREFIX = "// @xml-schema";

function splitArgs(input: string): string[] {
  const result: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < input.length; i++) {
    const c = input[i]!;

    if (quote) {
      if (c === quote) {
        quote = null;
      } else {
        current += c;
      }
      continue;
    }

    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }

    if (/\s/.test(c)) {
      if (current) {
        result.push(current);
        current = "";
      }
      continue;
    }

    current += c;
  }

  if (quote) {
    throw new Error("Unclosed quote");
  }

  if (current) {
    result.push(current);
  }

  return result;
}

export function parseXmlSchemaMarker(
  node: ts.Node,
  sourceFile: ts.SourceFile,
): string[] | undefined {
  const text = sourceFile.getFullText();

  const ranges = ts.getLeadingCommentRanges(text, node.pos) ?? [];

  for (const r of ranges) {
    if (r.kind !== ts.SyntaxKind.SingleLineCommentTrivia) continue;
    const comment = text.slice(r.pos, r.end).trim();
    if (!comment.startsWith(MARKER_PREFIX)) continue;
    return splitArgs(comment.slice(MARKER_PREFIX.length).trim());
  }

  return undefined;
}
