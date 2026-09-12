import * as ts from "typescript";

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

export async function generate(options: GenerateOptions): Promise<void> {
  const config = ts.readConfigFile(options.tsconfig, ts.sys.readFile);

  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ".");

  const program = ts.createProgram({
    rootNames: [options.input],
    options: parsed.options,
  });

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;

    visit(sourceFile, sourceFile);
  }
}

function visit(node: ts.Node, sourceFile: ts.SourceFile) {
  if (ts.isInterfaceDeclaration(node) && hasXmlSchemaMarker(node, sourceFile)) {
    analyzeInterface(node, sourceFile);
  }

  ts.forEachChild(node, (child) => visit(child, sourceFile));
}

function hasXmlSchemaMarker(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): boolean {
  const text = sourceFile.getFullText();

  const ranges = ts.getLeadingCommentRanges(text, node.pos) ?? [];

  return ranges.some((r) => {
    if (r.kind !== ts.SyntaxKind.SingleLineCommentTrivia) return false;

    return text.slice(r.pos, r.end).trim() === "// @xml-schema";
  });
}

function analyzeInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile) {
  console.log(
    node.name.text,
    node.members.map((m) => m.getText(sourceFile)),
  );
}
