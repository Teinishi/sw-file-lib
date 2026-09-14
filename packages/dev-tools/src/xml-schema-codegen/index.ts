import path from "node:path";
import * as ts from "typescript";
import { analyzeInterfaceNode, type FileAnalyzeContext } from "./analyzer";
import { analyzeComment as analyzeJSDocComment, convertJSDocComment } from "./comments";
import { generateImmutableInterfaceCode, generateSchemaCode } from "./generate-code";
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

  function visit(node: ts.Node, context: FileAnalyzeContext) {
    if (ts.isInterfaceDeclaration(node)) {
      const args = parseXmlSchemaMarker(node, context.sourceFile);
      if (args) {
        const codes = processInterfaceDeclaration(node, args, context);
        context.schemaCodeEntries.push(codes.schemaCode);
        context.immutableInterfaceCodeEntries.push(codes.immutableInterfaceCode);
      }
    }

    ts.forEachChild(node, (child) => visit(child, context));
  }

  const generatedFiles: GeneratedFile[] = [];

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
      schemaCodeEntries: [],
      immutableInterfaceCodeEntries: [],
    };

    visit(sourceFile, context);

    generatedFiles.push(...generateFile(stem, context, options));
  }

  return generatedFiles;
}

function processInterfaceDeclaration(
  node: ts.InterfaceDeclaration,
  args: string[],
  context: FileAnalyzeContext,
): { schemaCode: string; immutableInterfaceCode: string } {
  const info = analyzeInterfaceNode(node, args, context);
  const comments = analyzeJSDocComment(node, context.sourceFile);

  let schemaCode = "";
  let immutableInterfaceCode = "";
  if (comments) {
    schemaCode =
      convertJSDocComment(info, comments, context.sourceFile, {
        target: "schema",
        see: ["mutable", "immutable"],
      }) + "\n";

    immutableInterfaceCode =
      convertJSDocComment(info, comments, context.sourceFile, {
        target: "immutable",
        see: ["schema", "mutable"],
      }) + "\n";
  }

  schemaCode += generateSchemaCode(info);
  immutableInterfaceCode += generateImmutableInterfaceCode(info);

  return { schemaCode, immutableInterfaceCode };
}

function generateFile(
  stem: string,
  context: FileAnalyzeContext,
  options: GenerateOptions,
): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  const schemaFile = generateSchemaFile(stem, context, options);
  if (schemaFile) {
    files.push(schemaFile);
  }

  const immutableInterfaceFile = generateImmutableInterfaceFile(stem, context, options);
  if (immutableInterfaceFile) {
    files.push(immutableInterfaceFile);
  }

  return files;
}

function generateSchemaFile(
  stem: string,
  context: FileAnalyzeContext,
  options: GenerateOptions,
): GeneratedFile | undefined {
  if (context.schemaCodeEntries.length === 0) return;

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
    context.schemaCodeEntries.unshift(importStatements.join("\n"));
  }

  return {
    name: `${stem}-schema.ts`,
    content: context.schemaCodeEntries.join("\n\n") + "\n",
  };
}

function generateImmutableInterfaceFile(
  stem: string,
  context: FileAnalyzeContext,
  _options: GenerateOptions,
): GeneratedFile | undefined {
  if (context.immutableInterfaceCodeEntries.length === 0) return;

  const importStatements = Array.from(
    context.typeAliasImportMap.entries(),
    ([path, names]) =>
      `import type { ${Array.from(names)
        .map((n) => `${n}Immutable`)
        .join(", ")} } from "${path}-immutable";`,
  );
  if (importStatements.length > 0) {
    context.immutableInterfaceCodeEntries.unshift(importStatements.join("\n"));
  }

  return {
    name: `${stem}-immutable.ts`,
    content: context.immutableInterfaceCodeEntries.join("\n\n") + "\n",
  };
}
