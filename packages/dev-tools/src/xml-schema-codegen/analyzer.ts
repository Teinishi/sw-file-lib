import * as ts from "typescript";

export interface ObjectSchemaMemberInfo {
  name: string;
  type: SchemaTypeInfo;
  optional: boolean;
}

export type ObjectSchemaInfo = {
  kind: "object";
  members: ObjectSchemaMemberInfo[];
};

export type SchemaTypeInfo =
  | { kind: "boolean" }
  | { kind: "number" }
  | { kind: "string" }
  | { kind: "union"; types: SchemaTypeInfo[] }
  | ObjectSchemaInfo
  | { kind: "identifier"; name: string };

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
      throw new Error(`Property ${memberName} has no type`);
    }

    const typeInfo: SchemaTypeInfo = analyzeTypeNode(typeNode, sourceFile);

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

function analyzeTypeNode(node: ts.TypeNode, sourceFile: ts.SourceFile): SchemaTypeInfo {
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
  /*if (ts.isArrayTypeNode(node)) {
    return {
      kind: "array",
      elementType: analyzeTypeNode(node.elementType, sourceFile),
    };
  }*/
  if (ts.isTypeLiteralNode(node)) {
    const members: ObjectSchemaMemberInfo[] = [];
    for (const m of node.members) {
      if (!ts.isPropertySignature(m)) continue;

      const memberName = m.name.getText(sourceFile);
      const optional = !!m.questionToken;
      const typeNode = m.type;

      if (!typeNode) {
        throw new Error(`Property ${memberName} has no type`);
      }

      const typeInfo: SchemaTypeInfo = analyzeTypeNode(typeNode, sourceFile);

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
