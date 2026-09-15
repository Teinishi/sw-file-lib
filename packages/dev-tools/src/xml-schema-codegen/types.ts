import path from "node:path";
import type ts from "typescript";
import type { GenerateOptions } from ".";
import { SetMap } from "./utils";

export type FileKind = "schema" | "mutableInterface" | "immutableInterface";
export type OutputFileKind = "schema" | "immutableInterface";

export interface FilePaths {
  schema: string;
  mutableInterface: string;
  immutableInterface: string;
}

export interface FileAnalyzeContext {
  checker: ts.TypeChecker;
  sourceFile: ts.SourceFile;
  filePaths: FilePaths;
  typeAliasImportMap: SetMap<string, string>;
  docLinkImport: {
    schema: SetMap<string, string>;
    mutableInterface: SetMap<string, string>;
    immutableInterface: SetMap<string, string>;
  };
  schemaCodeEntries: string[];
  immutableInterfaceCodeEntries: string[];
}

export function newContext(
  stem: string,
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  options: GenerateOptions,
): FileAnalyzeContext {
  return {
    checker,
    sourceFile,
    filePaths: {
      schema: path.join(options.outDir, `${stem}-schema.ts`),
      mutableInterface: sourceFile.fileName,
      immutableInterface: path.join(options.outDir, `${stem}-immutable.ts`),
    },
    typeAliasImportMap: new SetMap(),
    docLinkImport: {
      schema: new SetMap(),
      mutableInterface: new SetMap(),
      immutableInterface: new SetMap(),
    },
    schemaCodeEntries: [],
    immutableInterfaceCodeEntries: [],
  };
}

export type IdentifierSchemaInfo = {
  kind: "identifier";
  name: string;
  declaredFile?: string;
};

export interface ObjectSchemaMemberInfo {
  name: string;
  type: SchemaTypeInfo;
  optional: boolean;
}

export type ObjectSchemaInfo = {
  kind: "object";
  members: ObjectSchemaMemberInfo[];
};

export type ListSchemaInfo = {
  kind: "list";
  itemTag: string;
  elementType: SchemaTypeInfo;
};

export type SchemaTypeInfo =
  | { kind: "boolean" }
  | { kind: "number" }
  | { kind: "string" }
  | { kind: "union"; types: SchemaTypeInfo[] }
  | IdentifierSchemaInfo
  | ObjectSchemaInfo
  | ListSchemaInfo;

export type ElementSchemaInfo = ObjectSchemaInfo;

export interface JSDocParagraph {
  text: string;
  links?: string[];
}

export interface JSDocInfo {
  paragraphs: JSDocParagraph[];
}

export interface SchemaDeclarationInfo {
  name: string;
  schema: ElementSchemaInfo;
  jsdoc: JSDocInfo[] | undefined;
}

export interface InputFileInfo {
  path: string;
  name: string;
  schemas: SchemaDeclarationInfo[];
  schemaImports: SetMap<string, string>;
}
