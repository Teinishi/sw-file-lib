import path from "node:path";
import * as ts from "typescript";
import { analyzeInterfaceNode } from "./analyzer";
import { analyzeComment as analyzeJSDocComment, convertJSDocComment } from "./comments";
import { generateCode } from "./generate-code";
import { splitArgs } from "./utils";

const MARKER_PREFIX = "// @xml-schema";

export interface Config {
  input: string | string[];
  outDir: string;
  tsconfig: string;
  xImportStatement?: string;
}

export function defineConfig(config: Config): Config {
  return config;
}

export interface GenerateOptions {
  input: string[];
  outDir: string;
  tsconfig: string;
  xImportStatement?: string;
  check?: boolean;
}

export type GeneratedFile = {
  name: string;
  content: string;
};

export function generate(options: GenerateOptions): GeneratedFile[] {
  const tsconfig = ts.readConfigFile(options.tsconfig, ts.sys.readFile);

  const parsed = ts.parseJsonConfigFileContent(tsconfig.config, ts.sys, ".");

  const program = ts.createProgram({
    rootNames: options.input,
    options: parsed.options,
  });

  const inputStems = options.input.map((i) => ({
    key: i,
    value: path.basename(i, path.extname(i)),
  }));

  const fileEntriesMap: Map<string, string[]> = new Map();

  function visit(node: ts.Node, sourceFile: ts.SourceFile, fileKey: string) {
    if (ts.isInterfaceDeclaration(node)) {
      const args = parseXmlSchemaMarker(node, sourceFile);
      if (args) {
        const code = processSchemaInterface(node, sourceFile, args);
        fileEntriesMap.get(fileKey)!.push(code);
      }
    }

    ts.forEachChild(node, (child) => visit(child, sourceFile, fileKey));
  }

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;

    const stem = inputStems.find(
      ({ key }) => path.resolve(key) === path.resolve(sourceFile.fileName),
    )?.value;
    if (!stem) continue;

    fileEntriesMap.set(stem, []);
    if (options.xImportStatement) {
      fileEntriesMap.get(stem)!.push(options.xImportStatement);
    }

    visit(sourceFile, sourceFile, stem);
  }

  return Array.from(fileEntriesMap.entries(), ([stem, entries]) => ({
    name: `${stem}-schema.ts`,
    content: entries.join("\n\n") + "\n",
  }));
}

function processSchemaInterface(
  node: ts.InterfaceDeclaration,
  sourceFile: ts.SourceFile,
  args: string[],
): string {
  const info = analyzeInterfaceNode(node, sourceFile, args);
  const comments = analyzeJSDocComment(node, sourceFile);

  let code = "";
  if (comments) {
    code =
      convertJSDocComment(info, comments, sourceFile, {
        target: "schema",
        see: ["mutable", "immutable"],
      }) + "\n";
  }
  code += generateCode(info);

  return code;
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
