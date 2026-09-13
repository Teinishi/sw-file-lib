import path from "node:path";
import * as ts from "typescript";
import { analyzeInterfaceNode } from "./analyzer";
import { generateCode } from "./generate-code";
import { splitArgs } from "./utils";

const MARKER_PREFIX = "// @xml-schema";

export interface Config {
  input: string;
  outDir: string;
  tsconfig: string;
}

export function defineConfig(config: Config): Config {
  return config;
}

export interface GenerateOptions {
  input: string;
  outDir: string;
  tsconfig: string;
  check?: boolean;
}

export type GeneratedFile = {
  name: string;
  content: string;
};

export function generate(options: GenerateOptions): GeneratedFile[] {
  const config = ts.readConfigFile(options.tsconfig, ts.sys.readFile);

  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ".");

  const program = ts.createProgram({
    rootNames: [options.input],
    options: parsed.options,
  });

  const entries: string[] = [];

  function visit(node: ts.Node, sourceFile: ts.SourceFile) {
    if (ts.isInterfaceDeclaration(node)) {
      const args = parseXmlSchemaMarker(node, sourceFile);
      if (args) {
        const info = analyzeInterfaceNode(node, sourceFile, args);
        entries.push(generateCode(info));
      }
    }

    ts.forEachChild(node, (child) => visit(child, sourceFile));
  }

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;

    visit(sourceFile, sourceFile);
  }

  return [
    {
      name: `${path.basename(options.input, path.extname(options.input))}-schema.ts`,
      content: entries.join("\n\n") + "\n",
    },
  ];
}

function parseXmlSchemaMarker(
  node: ts.InterfaceDeclaration,
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
