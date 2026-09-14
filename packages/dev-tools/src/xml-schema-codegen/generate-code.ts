import type { ObjectSchemaMemberInfo, SchemaDeclarationInfo, SchemaTypeInfo } from "./analyzer";

export function generateCode(declaration: SchemaDeclarationInfo): string {
  const decl = `export const ${declaration.name}Schema = `;
  switch (declaration.schema.kind) {
    case "object":
      return `${decl}x.object(${generateSchemaShape(declaration.schema.members)});`;
  }
}

function generateSchemaShape(members: ObjectSchemaMemberInfo[]): string {
  const lines = members.map((m) => {
    let t = generateTypeSchema(m.type);
    if (m.optional) {
      t = `${t}.optional()`;
    }
    return `  ${m.name}: ${t}`;
  });
  return `{\n${lines.join(",\n")}\n}`;
}

function generateTypeSchema(type: SchemaTypeInfo): string {
  switch (type.kind) {
    case "boolean":
      return "x.boolean()";
    case "number":
      return "x.number()";
    case "string":
      return "x.string()";
    case "union":
      return `x.union([${type.types.map((t) => generateTypeSchema(t)).join(", ")}])`;
    case "object":
      return `x.object(${generateSchemaShape(type.members)})`;
    case "identifier":
      return `${type.name}Schema`;
  }
}
