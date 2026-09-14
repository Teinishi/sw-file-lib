import * as ts from "typescript";
import type { SchemaDeclarationInfo } from "./analyzer";

function getJSDoc(node: ts.Node): ts.JSDoc[] | undefined {
  return (node as any).jsDoc as ts.JSDoc[] | undefined;
}

export interface JSDocParagraph {
  text: string;
  links?: (ts.JSDocLink | ts.JSDocLinkCode | ts.JSDocLinkPlain)[];
}

export interface JSDocInfo {
  paragraphs: JSDocParagraph[];
}

export function analyzeComment(node: ts.Node, sourceFile: ts.SourceFile): JSDocInfo[] | undefined {
  const jsDoc = getJSDoc(node);
  if (!jsDoc || jsDoc.length === 0) return;

  return jsDoc.map((doc) => {
    if (!doc.comment) return { paragraphs: [] };

    if (typeof doc.comment === "string") {
      return { paragraphs: doc.comment.split("\n\n").map((text) => ({ text })) };
    }

    const paragraphs: JSDocParagraph[] = [];
    let currentParagraph: JSDocParagraph | undefined;

    for (const item of doc.comment) {
      if (ts.isJSDocLinkLike(item)) {
        if (!currentParagraph) {
          currentParagraph = { text: "" };
        }
        if (item.name) {
          currentParagraph.text += `{@link ${item.name.getFullText(sourceFile)}}`;
        }
        currentParagraph.links ??= [];
        currentParagraph.links.push(item);
      }

      const textArr = item.text.split("\n\n");
      if (textArr.length === 0) continue;

      currentParagraph ??= { text: "" };
      currentParagraph.text += textArr.shift();

      while (textArr.length > 0) {
        paragraphs.push(currentParagraph);
        currentParagraph = { text: textArr.shift()! };
      }
    }

    if (currentParagraph && currentParagraph.text.trim() !== "") {
      paragraphs.push(currentParagraph);
    }

    return { paragraphs };
  });
}

export type JSDocTarget = "schema" | "mutable" | "immutable";

export function convertJSDocComment(
  schemaInfo: SchemaDeclarationInfo,
  jsDocInfo: JSDocInfo[],
  sourceFile: ts.SourceFile,
  options: {
    target: JSDocTarget;
    see?: JSDocTarget[];
  },
): string[] {
  const target = options.target;
  const see = options.see && options.see.length > 0 ? options.see : undefined;

  const schemaName = `${schemaInfo.name}Schema`;
  const immutableName = `${schemaInfo.name}Immutable`;

  return jsDocInfo.map((doc) => {
    const paragraphs: string[] = [];

    for (const p of doc.paragraphs) {
      if (p.links?.some((l) => l.name?.getText(sourceFile) === immutableName)) {
        continue;
      }
      paragraphs.push(p.text);
    }

    switch (target) {
      case "mutable":
        throw new Error("Unimplemented");
      case "immutable":
        paragraphs.push(`This is the recommended type for function parameters when it does not need to modify the value.
Use {@link ${schemaInfo.name}} instead if mutation is required.`);
        break;
    }

    if (see) {
      paragraphs.push(
        see
          .map((t) => {
            switch (t) {
              case "schema":
                return `@see {@link ${schemaName}}`;
              case "mutable":
                return `@see {@link ${schemaInfo.name}}`;
              case "immutable":
                return `@see {@link ${immutableName}}`;
            }
          })
          .join("\n"),
      );
    }

    const lines = paragraphs.flatMap((p) => p.split("\n").concat(""));
    lines.pop(); // remove last empty line
    return "/**\n" + lines.map((l) => ` * ${l}`.trimEnd()).join("\n") + "\n */";
  });
}
