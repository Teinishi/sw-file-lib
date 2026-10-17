import { SetMap } from "./utils";

export type FileKind = "schema" | "mutableInterface" | "immutableInterface";
export type OutputFileKind = "schema" | "immutableInterface";

export interface FilePaths {
  schema: string;
  mutableInterface: string;
  immutableInterface: string;
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
  itemType: ElementSchemaInfo | IdentifierSchemaInfo;
};

export type MetalistSchemaInfo = {
  kind: "metalist";
  itemTag: string;
  metaMembers: ObjectSchemaMemberInfo[];
  itemType: ElementSchemaInfo | IdentifierSchemaInfo;
};

export type SchemaTypeInfo =
  | { kind: "boolean" }
  | { kind: "number" }
  | { kind: "string" }
  | { kind: "union"; types: SchemaTypeInfo[] }
  | IdentifierSchemaInfo
  | ObjectSchemaInfo
  | ListSchemaInfo
  | MetalistSchemaInfo;

export type ElementSchemaInfo = ObjectSchemaInfo | ListSchemaInfo | MetalistSchemaInfo;

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
