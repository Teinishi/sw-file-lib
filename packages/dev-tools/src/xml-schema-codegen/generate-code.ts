import type { ObjectSchemaMemberInfo, SchemaDeclarationInfo, SchemaTypeInfo } from "./analyzer";

export function generateSchemaCode(declaration: SchemaDeclarationInfo): string {
  const decl = `export const ${declaration.name}Schema = `;
  switch (declaration.schema.kind) {
    case "object":
      return `${decl}x.object(${generateSchemaShape(declaration.schema.members)});`;
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

function generateSchemaShape(members: ObjectSchemaMemberInfo[], indent: string = ""): string {
  const lines = members.map((m) => {
    let t = generateTypeSchema(m.type, indent + "  ");
    if (m.optional) {
      t = `${t}.optional()`;
    }
    return `${indent}  ${m.name}: ${t}`;
  });
  return `{\n${lines.join(",\n")}\n${indent}}`;
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
