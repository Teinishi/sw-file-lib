import type { ElementSchemaInfo, ObjectMemberInfo, TypeInfo } from "./analyzer";

export function generateCode(info: ElementSchemaInfo): string {
  const decl = `export const ${info.name}Schema = `;
  switch (info.kind) {
    case "objectSchema":
      return `${decl}x.object(${generateSchemaShape(info.members)});`;
  }
}

function generateSchemaShape(members: ObjectMemberInfo[]): string {
  const lines = members.map((m) => {
    let t = generateTypeSchema(m.type);
    if (m.optional) {
      t = `${t}.optional()`;
    }
    return `  ${m.name}: ${t}`;
  });
  return `{\n${lines.join(",\n")}\n}`;
}

function generateTypeSchema(type: TypeInfo): string {
  switch (type.kind) {
    case "boolean":
      return "x.boolean()";
    case "number":
      return "x.number()";
    case "string":
      return "x.string()";
    case "union":
      return `x.union([${type.types.map((t) => generateTypeSchema(t)).join(", ")}])`;
    case "array":
      return `x.list("", ${generateTypeSchema(type.elementType)})`;
    case "object":
      return `x.object(${generateSchemaShape(type.members)})`;
    case "identifier":
      return `${type.name}Schema`;
  }
}
