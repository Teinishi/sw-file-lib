import { type Application, type DeclarationReflection, ReflectionKind } from "typedoc";
import type { MarkdownThemeContext } from "typedoc-plugin-markdown";

export function load(app: Application) {
  if ("markdownHooks" in app.renderer) {
    (app.renderer as any).markdownHooks.on("content.begin", (context: MarkdownThemeContext) => {
      const refl = context.page.model;
      if (!refl.isDeclaration()) return;
      if (refl.kindOf(ReflectionKind.Interface)) {
        return interfaceCodeBlock(refl);
      } else if (refl.kindOf(ReflectionKind.Class)) {
        return classCodeBlock(refl);
      }
    });
  }
}

function interfaceCodeBlock(refl: DeclarationReflection): string | undefined {
  const md: string[] = [];

  md.push("```ts");
  if (refl.extendedTypes?.length) {
    const extendsList = refl.extendedTypes.map((t) => t.toString()).join(", ");
    md.push(`interface ${refl.name} extends ${extendsList} {`);
  } else {
    md.push(`interface ${refl.name} {`);
  }

  for (const prop of refl.getProperties()) {
    const code = propertyCode(prop);
    if (code !== undefined) md.push(`  ${code}`);
  }

  md.push("}");
  md.push("```");

  return md.join("\n");
}

function classCodeBlock(refl: DeclarationReflection): string | undefined {
  const md: string[] = [];

  md.push("```ts");
  if (refl.extendedTypes?.length) {
    const extendsList = refl.extendedTypes.map((t) => t.toString()).join(", ");
    md.push(`class ${refl.name} extends ${extendsList} {`);
  } else {
    md.push(`class ${refl.name} {`);
  }

  for (const prop of refl.getProperties()) {
    const code = propertyCode(prop);
    if (code !== undefined) md.push(`  ${code}`);
  }

  md.push("}");
  md.push("```");

  return md.join("\n");
}

function propertyCode(prop: DeclarationReflection): string | undefined {
  if (prop.kindOf(ReflectionKind.Property)) {
    const modifiers = prop.flags.isReadonly ? "readonly " : "";
    const type = prop.type?.toString() ?? "unknown";
    const optional = prop.flags.isOptional ? "?" : "";
    return `${modifiers}${prop.name}${optional}: ${type};`;
  } else if (prop.kindOf(ReflectionKind.Constructor)) {
    const params =
      prop.signatures?.[0]?.parameters
        ?.map((p) => {
          const paramName = p.name;
          const paramType = p.type?.toString() ?? "unknown";
          const optional = p.flags.isOptional ? "?" : "";
          return `${paramName}${optional}: ${paramType}`;
        })
        .join(", ") ?? "";
    return `constructor(${params});`;
  } else if (prop.kindOf(ReflectionKind.Method)) {
    const params =
      prop.signatures?.[0]?.parameters
        ?.map((p) => {
          const paramName = p.name;
          const paramType = p.type?.toString() ?? "unknown";
          const optional = p.flags.isOptional ? "?" : "";
          return `${paramName}${optional}: ${paramType}`;
        })
        .join(", ") ?? "";
    const returnType = prop.signatures?.[0]?.type?.toString() ?? "void";
    return `${prop.name}(${params}): ${returnType};`;
  }
}
