import ts from "typescript";
import type {
  FileKind,
  FilePaths,
  JSDocInfo,
  JSDocParagraph,
  OutputFileKind,
  SchemaDeclarationInfo,
} from "./types";
import { relativeImportPath, SetMap } from "./utils";

function getJSDoc(node: ts.Node): ts.JSDoc[] | undefined {
  return (node as any).jsDoc as ts.JSDoc[] | undefined;
}

export function analyzeJSDocComment(
  node: ts.Node,
  sourceFile: ts.SourceFile,
): JSDocInfo[] | undefined {
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
        currentParagraph.links ??= [];
        if (item.name) {
          const text = item.name.getFullText(sourceFile);
          currentParagraph.text += `{@link ${text}}`;
          currentParagraph.links.push(text);
        }
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

export function convertJSDocComment(
  schemaInfo: SchemaDeclarationInfo,
  imports: SetMap<string, string>,
  options: {
    filePaths: FilePaths;
    target: OutputFileKind;
    see?: FileKind[];
  },
): string[] | undefined {
  const outputFilePath = options.filePaths[options.target];
  const target = options.target;
  const see = options.see && options.see.length > 0 ? options.see : undefined;

  const identifiers = {
    schema: `${schemaInfo.name}Schema`,
    mutableInterface: schemaInfo.name,
    immutableInterface: `${schemaInfo.name}Immutable`,
  };

  return schemaInfo.jsdoc?.map((doc) => {
    const paragraphs: string[] = [];

    for (const p of doc.paragraphs) {
      // Immutable への @link を含む段落はスキップ
      if (p.links?.some((l) => l === identifiers.immutableInterface)) {
        continue;
      }

      // "Parent: {@link ...}" は @link を書き換え
      if (p.text.startsWith("Parent: ")) {
        const text = p.text.replaceAll(/\{@link ([^}]+)\}/g, (_, symbol: string) => {
          switch (target) {
            case "schema":
              return `{@link ${symbol}Schema}`;
            case "immutableInterface":
              return `{@link ${symbol}Immutable}`;
          }
        });
        paragraphs.push(text);
        continue;
      }

      paragraphs.push(p.text);
    }

    switch (target) {
      case "immutableInterface":
        paragraphs.push(`This is the recommended type for function parameters when it does not need to modify the value.
Use {@link ${identifiers.mutableInterface}} instead if mutation is required.`);
        break;
    }

    if (see) {
      let lines: string[] = [];
      for (const kind of see) {
        const symbol = identifiers[kind];
        const relativePath = relativeImportPath(outputFilePath, options.filePaths[kind]);
        imports.add(relativePath, symbol);
        lines.push(`@see {@link ${symbol}}`);
      }
      paragraphs.push(lines.join("\n"));
    }

    const lines = paragraphs.flatMap((p) => p.split("\n").concat(""));
    lines.pop(); // remove last empty line
    return "/**\n" + lines.map((l) => ` * ${l}`.trimEnd()).join("\n") + "\n */";
  });
}
