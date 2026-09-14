import * as ts from "typescript";
import { parseXmlSchemaMarker } from "./parse-marker";

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
  | { kind: "identifier"; name: string }
  | ObjectSchemaInfo
  | ListSchemaInfo;

export type ElementSchemaInfo = ObjectSchemaInfo;

export interface SchemaDeclarationInfo {
  name: string;
  schema: ElementSchemaInfo;
}

export function analyzeInterfaceNode(
  node: ts.InterfaceDeclaration,
  sourceFile: ts.SourceFile,
  _args: string[],
): SchemaDeclarationInfo {
  const name = node.name.text;
  const members: ObjectSchemaMemberInfo[] = [];

  for (const m of node.members) {
    if (!ts.isPropertySignature(m)) continue;

    const memberName = m.name.getText(sourceFile);
    const optional = !!m.questionToken;
    const typeNode = m.type;

    if (!typeNode) {
      throw new Error(`Property ${memberName} has no type at ${filenameAndLine(m, sourceFile)}`);
    }

    const memberArgs = parseXmlSchemaMarker(m, sourceFile);
    const typeInfo: SchemaTypeInfo = analyzeTypeNode(typeNode, sourceFile, memberArgs);

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
  sourceFile: ts.SourceFile,
  args: string[] | undefined,
): SchemaTypeInfo {
  if (args && args.length > 0) {
    const firstArg = args[0];

    switch (firstArg) {
      case "list":
        if (!ts.isArrayTypeNode(node)) {
          throw new Error(
            `Expected array type for list, got ${node.getText(sourceFile)} at ${filenameAndLine(node, sourceFile)}`,
          );
        }
        const itemTag = args[1];
        if (!itemTag) {
          throw new Error(`Missing item tag for list type at ${filenameAndLine(node, sourceFile)}`);
        }
        return {
          kind: "list",
          itemTag,
          elementType: analyzeTypeNode(node.elementType, sourceFile, []),
        };

      case "metalist":
        throw new Error("Unimplemented");

      default:
        throw new Error(
          `Unknown schema marker argument: ${firstArg} at ${filenameAndLine(node, sourceFile)}`,
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
      types: node.types.map((t) => analyzeTypeNode(t, sourceFile, [])),
    };
  }
  if (ts.isTypeLiteralNode(node)) {
    const members: ObjectSchemaMemberInfo[] = [];
    for (const m of node.members) {
      if (!ts.isPropertySignature(m)) continue;

      const memberName = m.name.getText(sourceFile);
      const optional = !!m.questionToken;
      const typeNode = m.type;

      if (!typeNode) {
        throw new Error(
          `Property ${memberName} has no type at ${filenameAndLine(node, sourceFile)}`,
        );
      }

      const memberArgs = parseXmlSchemaMarker(m, sourceFile);
      const typeInfo: SchemaTypeInfo = analyzeTypeNode(typeNode, sourceFile, memberArgs);

      members.push({
        name: memberName,
        type: typeInfo,
        optional,
      });
    }

    return { kind: "object", members };
  }
  if (ts.isTypeReferenceNode(node)) {
    const typeName = node.typeName.getText(sourceFile);
    return { kind: "identifier", name: typeName };
  }

  if (ts.isArrayTypeNode(node)) {
    throw new Error(
      `Array types must be annotated with '// @xml-schema list "{itemTag}"' at ${filenameAndLine(node, sourceFile)}`,
    );
  }

  throw new Error(`Unsupported type at ${filenameAndLine(node, sourceFile)}`);
}

function filenameAndLine(node: ts.Node, sourceFile: ts.SourceFile): string {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.pos);
  return `${sourceFile.fileName}:${line + 1}`;
}
