import ts from "typescript";
import { analyzeFile } from "./analyzer";
import {
  generateImmutableInterfaceFile,
  generateSchemaFile,
  createFilePaths,
} from "./generate-file";
import type { InputFileInfo } from "./types";

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
  path: string;
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

  const inputFiles: InputFileInfo[] = [];

  for (const sourceFile of program.getSourceFiles()) {
    const fileInfo = analyzeFile(checker, sourceFile, options);
    if (fileInfo) {
      inputFiles.push(fileInfo);
    }
  }

  const outFiles: GeneratedFile[] = [];

  for (const inputFile of inputFiles) {
    const filePaths = createFilePaths(inputFile, options.outDir);

    outFiles.push({
      path: filePaths.schema,
      content: generateSchemaFile(inputFile, filePaths, options),
    });

    outFiles.push({
      path: filePaths.immutableInterface,
      content: generateImmutableInterfaceFile(inputFile, filePaths),
    });
  }

  return outFiles;
}

/*function processInterfaceDeclaration(
  node: ts.InterfaceDeclaration,
  args: string[],
  context: FileAnalyzeContext,
): { schemaCode: string; immutableInterfaceCode: string } {
  const info = analyzeInterfaceNode(node, args, context);
  const comments = analyzeJSDocComment(node, context.sourceFile);
  return [];
}

/*function processInterfaceDeclaration(
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
      convertJSDocComment(info, comments, context, {
        target: "schema",
        see: ["mutableInterface", "immutableInterface"],
      }).join("\n") + "\n";

    immutableInterfaceCode =
      convertJSDocComment(info, comments, context, {
        target: "immutableInterface",
        see: ["schema", "mutableInterface"],
      }).join("\n") + "\n";
  }

  schemaCode += generateSchemaCode(info);
  immutableInterfaceCode += generateImmutableInterfaceCode(info);

  return { schemaCode, immutableInterfaceCode };
}

function generateFile(context: FileAnalyzeContext, options: GenerateOptions): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  const schemaFile = generateSchemaFile(context, options);
  if (schemaFile !== undefined) {
    files.push({
      path: context.filePaths.schema,
      content: schemaFile,
    });
  }

  const immutableInterfaceFile = generateImmutableInterfaceFile(context, options);
  if (immutableInterfaceFile !== undefined) {
    files.push({
      path: context.filePaths.immutableInterface,
      content: immutableInterfaceFile,
    });
  }

  return files;
}

function generateSchemaFile(
  context: FileAnalyzeContext,
  options: GenerateOptions,
): string | undefined {
  if (context.schemaCodeEntries.length === 0) return;

  const importStatements = generateImportStatements(context, "schema");
  if (options.xImportStatement) {
    importStatements.unshift(options.xImportStatement);
  }
  if (importStatements.length > 0) {
    context.schemaCodeEntries.unshift(importStatements.join("\n"));
  }

  return context.schemaCodeEntries.join("\n\n") + "\n";
}

function generateImmutableInterfaceFile(
  context: FileAnalyzeContext,
  _options: GenerateOptions,
): string | undefined {
  if (context.immutableInterfaceCodeEntries.length === 0) return;

  const importStatements = generateImportStatements(context, "immutableInterface");
  if (importStatements.length > 0) {
    context.immutableInterfaceCodeEntries.unshift(importStatements.join("\n"));
  }

  return context.immutableInterfaceCodeEntries.join("\n\n") + "\n";
}
*/
