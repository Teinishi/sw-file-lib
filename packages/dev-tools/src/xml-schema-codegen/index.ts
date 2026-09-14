import path from "node:path";
import * as ts from "typescript";
import { analyzeInterfaceNode, type FileAnalyzeContext } from "./analyzer";
import { analyzeComment as analyzeJSDocComment, convertJSDocComment } from "./comments";
import { generateCode } from "./generate-code";
import { parseXmlSchemaMarker } from "./parse-marker";

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
  const checker = program.getTypeChecker();

  const inputStems = options.input.map((i) => ({
    key: i,
    value: path.basename(i, path.extname(i)),
  }));

  const fileEntriesMap: Map<string, string[]> = new Map();

  function visit(node: ts.Node, context: FileAnalyzeContext) {
    if (ts.isInterfaceDeclaration(node)) {
      const args = parseXmlSchemaMarker(node, context.sourceFile);
      if (args) {
        const code = processSchemaInterface(node, args, context);
        context.codeEntries.push(code);
      }
    }

    ts.forEachChild(node, (child) => visit(child, context));
  }

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;

    const stem = inputStems.find(
      ({ key }) => path.resolve(key) === path.resolve(sourceFile.fileName),
    )?.value;
    if (!stem) continue;

    const context: FileAnalyzeContext = {
      checker,
      sourceFile,
      typeAliasImportMap: new Map(),
      codeEntries: [],
    };

    visit(sourceFile, context);

    if (context.codeEntries.length === 0) continue;

    const importStatements = Array.from(
      context.typeAliasImportMap.entries(),
      ([path, names]) =>
        `import { ${Array.from(names)
          .map((n) => `${n}Schema`)
          .join(", ")} } from "${path}-schema";`,
    );
    if (options.xImportStatement) {
      importStatements.unshift(options.xImportStatement);
    }
    if (importStatements.length > 0) {
      context.codeEntries.unshift(importStatements.join("\n"));
    }

    fileEntriesMap.set(stem, context.codeEntries);
  }

  return Array.from(fileEntriesMap.entries(), ([stem, entries]) => ({
    name: `${stem}-schema.ts`,
    content: entries.join("\n\n") + "\n",
  }));
}

function processSchemaInterface(
  node: ts.InterfaceDeclaration,
  args: string[],
  context: FileAnalyzeContext,
): string {
  const info = analyzeInterfaceNode(node, args, context);
  const comments = analyzeJSDocComment(node, context.sourceFile);

  let code = "";
  if (comments) {
    code =
      convertJSDocComment(info, comments, context.sourceFile, {
        target: "schema",
        see: ["mutable", "immutable"],
      }) + "\n";
  }
  code += generateCode(info);

  return code;
}
