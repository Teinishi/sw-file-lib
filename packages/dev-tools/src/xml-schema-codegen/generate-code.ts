import type { ObjectSchemaMemberInfo, SchemaDeclarationInfo, SchemaTypeInfo } from "./types";
import type { SetMap } from "./utils";

export function generateImportBlock(options: {
  imports?: SetMap<string, string> | undefined;
  typeImports?: SetMap<string, string> | undefined;
  commentImports?: SetMap<string, string> | undefined;
  importStatements?: string[] | undefined;
}): string | undefined {
  const { imports, typeImports, commentImports, importStatements } = options;

  for (const [path, symbols] of imports?.entries() ?? []) {
    for (const symbol of symbols) {
      typeImports?.remove(path, symbol);
      commentImports?.remove(path, symbol);
    }
  }

  for (const [path, symbols] of typeImports?.entries() ?? []) {
    for (const symbol of symbols) {
      commentImports?.remove(path, symbol);
    }
  }

  const lines: string[] = [];

  if (importStatements) {
    lines.push(...importStatements);
  }

  if (imports) {
    lines.push(...generateImportStatements(imports));
  }

  if (typeImports) {
    lines.push(...generateImportStatements(typeImports, { isType: true }));
  }

  if (commentImports) {
    // oxfmt の sortImports.partitionByComment を true にしておく必要あり
    lines.push("/* oxlint-disable no-unused-vars */");
    lines.push(...generateImportStatements(commentImports, { isType: true }));
    lines.push("/* oxlint-enable no-unused-vars */");
  }

  return lines.length > 0 ? lines.join("\n") : undefined;
}

function generateImportStatements(
  setMap: SetMap<string, string>,
  options?: {
    isType?: boolean;
    symbolSuffix?: string;
    pathSuffix?: string;
  },
): string[] {
  return Array.from(setMap.entries(), ([path, names]) => {
    if (names.size === 0) return null;

    let code = "import";
    if (options?.isType) {
      code += " type";
    }
    code += " { ";
    code += Array.from(names)
      .map((n) => `${n}${options?.symbolSuffix ?? ""}`)
      .join(", ");
    code += ` } from "${path}${options?.pathSuffix ?? ""}";`;
    return code;
  }).filter((code): code is string => code !== null);
}

export function generateSchemaCode(declaration: SchemaDeclarationInfo): string {
  const decl = `export const ${declaration.name}Schema = `;
  switch (declaration.schema.kind) {
    case "object":
      return `${decl}x.object(${generateSchemaShape(declaration.schema.members)});`;
  }
}

function generateSchemaShape(members: ObjectSchemaMemberInfo[], indent: string = ""): string {
  const lines = members.map((m) => {
    let t = generateTypeSchema(m.type, indent + "  ");
    if (m.optional) {
      t = `${t}.optional()`;
    }
    return `${indent}  ${m.name}: ${t},`;
  });
  return `{\n${lines.join("\n")}\n${indent}}`;
}

function generateTypeSchema(type: SchemaTypeInfo, indent: string = ""): string {
  switch (type.kind) {
    case "boolean":
      return "x.boolean()";
    case "number":
      return "x.number()";
    case "string":
      return "x.string()";
    case "union":
      return `x.union([${type.types.map((t) => generateTypeSchema(t, indent)).join(", ")}])`;
    case "identifier":
      return `${type.name}Schema`;
    case "object":
      return `x.object(${generateSchemaShape(type.members, indent)})`;
    case "list":
      return `x.list("${type.itemTag}", ${generateTypeSchema(type.elementType, indent)})`;
  }
}

export function generateImmutableInterfaceCode(declaration: SchemaDeclarationInfo): string {
  let body: string;

  switch (declaration.schema.kind) {
    case "object":
      body = generateImmutableInterfaceShape(declaration.schema.members);
      break;
  }

  return `export interface ${declaration.name}Immutable ${body}`;
}

function generateImmutableInterfaceShape(
  members: ObjectSchemaMemberInfo[],
  indent: string = "",
): string {
  const lines = members.map((m) => {
    return `${indent}  readonly ${m.name}${m.optional ? "?" : ""}: ${generateImmutableInterfaceType(
      m.type,
      indent + "  ",
    )};`;
  });
  return `{\n${lines.join("\n")}\n${indent}}`;
}

function generateImmutableInterfaceType(type: SchemaTypeInfo, indent: string = ""): string {
  switch (type.kind) {
    case "boolean":
      return "boolean";
    case "number":
      return "number";
    case "string":
      return "string";
    case "union":
      return `${type.types.map((t) => generateImmutableInterfaceType(t, indent)).join(" | ")}`;
    case "identifier":
      return `${type.name}Immutable`;
    case "object":
      return generateImmutableInterfaceShape(type.members, indent);
    case "list":
      return `readonly ${generateImmutableInterfaceType(type.elementType, indent)}[]`;
  }
}
