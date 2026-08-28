import { type Application, type DeclarationReflection, ReflectionKind } from "typedoc";
import type { MarkdownThemeContext } from "typedoc-plugin-markdown";

export function load(app: Application) {
  if ("markdownHooks" in app.renderer) {
    (app.renderer as any).markdownHooks.on("content.begin", (context: MarkdownThemeContext) => {
      const refl = context.page.model;
      if (!refl.isDeclaration()) return;
      return interfaceCodeBlock(refl);
    });
  }
}

function interfaceCodeBlock(refl: DeclarationReflection): string | undefined {
  if (!refl.kindOf(ReflectionKind.Interface)) return;

  const md: string[] = [];

  md.push("```ts");
  if (refl.extendedTypes?.length) {
    const extendsList = refl.extendedTypes.map((t) => t.toString()).join(", ");
    md.push(`interface ${refl.name} extends ${extendsList} {`);
  } else {
    md.push(`interface ${refl.name} {`);
  }

  for (const prop of refl.getProperties()) {
    const modifiers = prop.flags.isReadonly ? "readonly " : "";
    const type = prop.type?.toString() ?? "unknown";
    const optional = prop.flags.isOptional ? "?" : "";
    md.push(`  ${modifiers}${prop.name}${optional}: ${type};`);
  }

  md.push("}");
  md.push("```");

  return md.join("\n");
}
