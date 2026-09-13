import * as ts from "typescript";

export type TypeInfo =
  | { kind: "boolean" }
  | { kind: "number" }
  | { kind: "string" }
  | { kind: "union"; types: TypeInfo[] }
  | { kind: "array"; elementType: TypeInfo }
  | { kind: "object"; members: ObjectMemberInfo[] }
  | { kind: "identifier"; name: string };

export interface ObjectMemberInfo {
  name: string;
  type: TypeInfo;
  optional: boolean;
}

export interface ObjectSchemaInfo {
  kind: "objectSchema";
  name: string;
  members: ObjectMemberInfo[];
}

export type ElementSchemaInfo = ObjectSchemaInfo;

export function analyzeInterfaceNode(
  node: ts.InterfaceDeclaration,
  sourceFile: ts.SourceFile,
  _args: string[],
): ElementSchemaInfo {
  const name = node.name.text;
  const members: ObjectMemberInfo[] = [];

  for (const m of node.members) {
    if (!ts.isPropertySignature(m)) continue;

    const memberName = m.name.getText(sourceFile);
    const optional = !!m.questionToken;
    const typeNode = m.type;

    if (!typeNode) {
      throw new Error(`Property ${memberName} has no type`);
    }

    const typeInfo: TypeInfo = analyzeTypeNode(typeNode, sourceFile);

    members.push({
      name: memberName,
      type: typeInfo,
      optional,
    });
  }

  return { kind: "objectSchema", name, members };
}

function analyzeTypeNode(node: ts.TypeNode, sourceFile: ts.SourceFile): TypeInfo {
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
      types: node.types.map((t) => analyzeTypeNode(t, sourceFile)),
    };
  }
  if (ts.isArrayTypeNode(node)) {
    return {
      kind: "array",
      elementType: analyzeTypeNode(node.elementType, sourceFile),
    };
  }
  if (ts.isTypeLiteralNode(node)) {
    const members: ObjectMemberInfo[] = [];
    for (const m of node.members) {
      if (!ts.isPropertySignature(m)) continue;

      const memberName = m.name.getText(sourceFile);
      const optional = !!m.questionToken;
      const typeNode = m.type;

      if (!typeNode) {
        throw new Error(`Property ${memberName} has no type`);
      }

      const typeInfo: TypeInfo = analyzeTypeNode(typeNode, sourceFile);

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

  throw new Error(`Unsupported type: ${node.getText(sourceFile)} at ${sourceFile.fileName}`);
}
