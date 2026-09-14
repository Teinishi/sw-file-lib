import path from "node:path";
import consola from "consola";
import * as ts from "typescript";
import { parseXmlSchemaMarker } from "./parse-marker";

export interface FileAnalyzeContext {
  checker: ts.TypeChecker;
  sourceFile: ts.SourceFile;
  typeAliasImportMap: Map<string, Set<string>>;
  schemaCodeEntries: string[];
  immutableInterfaceCodeEntries: string[];
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

export interface SchemaDeclarationInfo {
  name: string;
  schema: ElementSchemaInfo;
}

export function analyzeInterfaceNode(
  node: ts.InterfaceDeclaration,
  _args: string[],
  context: FileAnalyzeContext,
): SchemaDeclarationInfo {
  const name = node.name.text;
  const members: ObjectSchemaMemberInfo[] = [];

  for (const m of node.members) {
    if (!ts.isPropertySignature(m)) continue;

    const memberName = m.name.getText(context.sourceFile);
    const optional = !!m.questionToken;
    const typeNode = m.type;

    if (!typeNode) {
      throw new Error(
        `Property ${memberName} has no type at ${filenameAndLine(m, context.sourceFile)}`,
      );
    }

    const memberArgs = parseXmlSchemaMarker(m, context.sourceFile);
    const typeInfo: SchemaTypeInfo = analyzeTypeNode(typeNode, memberArgs, context);

    members.push({
      name: memberName,
      type: typeInfo,
      optional,
    });
  }

  return {
    name,
    schema: {
      kind: "object",
      members,
    },
  };
}

function analyzeTypeNode(
  node: ts.TypeNode,
  args: string[] | undefined,
  context: FileAnalyzeContext,
): SchemaTypeInfo {
  if (args && args.length > 0) {
    const firstArg = args[0];

    switch (firstArg) {
      case "list":
        if (!ts.isArrayTypeNode(node)) {
          throw new Error(
            `Expected array type for list, got ${node.getText(context.sourceFile)} at ${filenameAndLine(node, context.sourceFile)}`,
          );
        }
        const itemTag = args[1];
        if (!itemTag) {
          throw new Error(
            `Missing item tag for list type at ${filenameAndLine(node, context.sourceFile)}`,
          );
        }
        return {
          kind: "list",
          itemTag,
          elementType: analyzeTypeNode(node.elementType, [], context),
        };

      case "metalist":
        throw new Error("Unimplemented");

      default:
        throw new Error(
          `Unknown schema marker argument: ${firstArg} at ${filenameAndLine(node, context.sourceFile)}`,
        );
    }
  }

  switch (node.kind) {
    case ts.SyntaxKind.BooleanKeyword:
      return { kind: "boolean" };
    case ts.SyntaxKind.NumberKeyword:
      return { kind: "number" };
    case ts.SyntaxKind.StringKeyword:
      return { kind: "string" };
  }

  if (ts.isUnionTypeNode(node)) {
    return {
      kind: "union",
      types: node.types.map((t) => analyzeTypeNode(t, [], context)),
    };
  }

  if (ts.isTypeReferenceNode(node)) {
    const typeName = node.typeName.getText(context.sourceFile);
    const sourceFile = getDefinitionSourceFile(node, context.checker);
    if (!sourceFile) {
      consola.warn(
        `Could not find source file for type reference ${typeName} at ${filenameAndLine(node, context.sourceFile)}`,
      );
    }
    const sourceFileName = sourceFile !== context.sourceFile ? sourceFile?.fileName : undefined;
    if (sourceFileName) {
      const relative = relativeImportPath(
        path.resolve(context.sourceFile.fileName),
        path.resolve(sourceFileName),
      );
      if (!context.typeAliasImportMap.has(relative)) {
        context.typeAliasImportMap.set(relative, new Set());
      }
      context.typeAliasImportMap.get(relative)!.add(typeName);
    }

    return {
      kind: "identifier",
      name: typeName,
      ...(sourceFileName ? { declaredFile: sourceFileName } : {}),
    };
  }

  if (ts.isTypeLiteralNode(node)) {
    const members: ObjectSchemaMemberInfo[] = [];
    for (const m of node.members) {
      if (!ts.isPropertySignature(m)) continue;

      const memberName = m.name.getText(context.sourceFile);
      const optional = !!m.questionToken;
      const typeNode = m.type;

      if (!typeNode) {
        throw new Error(
          `Property ${memberName} has no type at ${filenameAndLine(node, context.sourceFile)}`,
        );
      }

      const memberArgs = parseXmlSchemaMarker(m, context.sourceFile);
      const typeInfo: SchemaTypeInfo = analyzeTypeNode(typeNode, memberArgs, context);

      members.push({
        name: memberName,
        type: typeInfo,
        optional,
      });
    }

    return { kind: "object", members };
  }

  if (ts.isArrayTypeNode(node)) {
    throw new Error(
      `Array types must be annotated with '// @xml-schema list "{itemTag}"' at ${filenameAndLine(node, context.sourceFile)}`,
    );
  }

  throw new Error(`Unsupported type at ${filenameAndLine(node, context.sourceFile)}`);
}

function getDefinitionSourceFile(
  node: ts.TypeReferenceNode,
  checker: ts.TypeChecker,
): ts.SourceFile | undefined {
  const symbol = checker.getSymbolAtLocation(node.typeName);
  if (!symbol) return;

  const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  const decl = target.declarations?.[0];
  return decl?.getSourceFile();
}

function relativeImportPath(from: string, to: string): string {
  let rel = path.relative(path.dirname(from), to.replace(/\.ts?$/, ""));
  rel = rel.replace(/\\/g, "/");
  if (!rel.startsWith(".")) {
    rel = "./" + rel;
  }
  return rel;
}

function filenameAndLine(node: ts.Node, sourceFile: ts.SourceFile): string {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.pos);
  return `${sourceFile.fileName}:${line + 1}`;
}
