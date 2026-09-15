import path from "node:path";
import consola from "consola";
import ts from "typescript";
import type { GenerateOptions } from ".";
import { analyzeJSDocComment } from "./comments";
import { parseXmlSchemaMarker } from "./parse-marker";
import {
  type ElementSchemaInfo,
  type IdentifierSchemaInfo,
  type InputFileInfo,
  type MetalistSchemaInfo,
  type ObjectSchemaInfo,
  type ObjectSchemaMemberInfo,
  type SchemaDeclarationInfo,
  type SchemaTypeInfo,
} from "./types";
import { filenameAndLine, relativeImportPath, SetMap } from "./utils";

interface FileAnalyzeContext {
  checker: ts.TypeChecker;
  sourceFile: ts.SourceFile;
  schemaImports: SetMap<string, string>;
}

export function analyzeFile(
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  options: GenerateOptions,
): InputFileInfo | undefined {
  if (sourceFile.isDeclarationFile) return;

  const inputPath = options.input.find(
    (i) => path.resolve(i) === path.resolve(sourceFile.fileName),
  );
  if (inputPath === undefined) return;

  const stem = path.basename(inputPath, path.extname(inputPath));

  const context: FileAnalyzeContext = {
    checker,
    sourceFile,
    schemaImports: new SetMap(),
  };

  const schemas: SchemaDeclarationInfo[] = [];

  function visit(node: ts.Node) {
    if (ts.isInterfaceDeclaration(node)) {
      const args = parseXmlSchemaMarker(node, sourceFile);
      if (args) {
        const info = analyzeInterfaceNode(node, args, context);
        schemas.push(info);
      }
    }

    ts.forEachChild(node, (child) => visit(child));
  }

  visit(sourceFile);

  if (schemas.length === 0) return;

  return {
    path: inputPath,
    name: stem,
    schemas,
    schemaImports: context.schemaImports,
  };
}

function analyzeInterfaceNode(
  node: ts.InterfaceDeclaration,
  args: string[],
  context: FileAnalyzeContext,
): SchemaDeclarationInfo {
  const name = node.name.text;

  let schema: ElementSchemaInfo;

  const firstArg = args[0];
  switch (args[0]) {
    case "list":
      throw new Error("Unimplemented");
    case "metalist":
      const itemTag = args[1];
      if (!itemTag) {
        throw new Error(
          `Missing item tag for metalist type at ${filenameAndLine(node, context.sourceFile)}`,
        );
      }
      schema = analyzeMetalistInterfaceNode(node, itemTag, context);
      break;

    case "object":
    case undefined:
      schema = analyzeObjectInterfaceNode(node, context);
      break;

    default:
      throw new Error(
        `Unknown schema marker argument: ${firstArg} at ${filenameAndLine(node, context.sourceFile)}`,
      );
  }

  const jsdoc = analyzeJSDocComment(node, context.sourceFile);

  return {
    name,
    schema,
    jsdoc,
  };
}

function analyzeObjectInterfaceNode(
  node: ts.InterfaceDeclaration,
  context: FileAnalyzeContext,
): ObjectSchemaInfo {
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
    kind: "object",
    members,
  };
}

function analyzeMetalistInterfaceNode(
  node: ts.InterfaceDeclaration,
  itemTag: string,
  context: FileAnalyzeContext,
): MetalistSchemaInfo {
  let metaField: ts.TypeElement | undefined;
  let itemsField: ts.TypeElement | undefined;

  for (const m of node.members) {
    const memberName = m.name?.getText(context.sourceFile);

    switch (memberName) {
      case "meta":
        metaField = m;
        break;
      case "items":
        itemsField = m;
        break;
      default:
        throw new Error(
          `Unexpected member ${memberName} in metalist interface at ${filenameAndLine(m, context.sourceFile)}`,
        );
    }
  }

  if (!metaField) {
    throw new Error(
      `Missing 'meta' member in metalist interface at ${filenameAndLine(node, context.sourceFile)}`,
    );
  }
  if (!itemsField) {
    throw new Error(
      `Missing 'items' member in metalist interface at ${filenameAndLine(node, context.sourceFile)}`,
    );
  }
  if (metaField.questionToken) {
    throw new Error(
      `'meta' member in metalist interface cannot be optional at ${filenameAndLine(metaField, context.sourceFile)}`,
    );
  }
  if (itemsField.questionToken) {
    throw new Error(
      `'items' member in metalist interface cannot be optional at ${filenameAndLine(itemsField, context.sourceFile)}`,
    );
  }
  if (!ts.isPropertySignature(metaField) || !ts.isPropertySignature(itemsField)) {
    throw new Error(
      `Members 'meta' and 'items' in metalist interface must be property signatures at ${filenameAndLine(
        node,
        context.sourceFile,
      )}`,
    );
  }

  const metaTypeNode = metaField.type;
  const itemsTypeNode = itemsField.type;

  if (!metaTypeNode) {
    throw new Error(
      `'meta' member in metalist interface has no type at ${filenameAndLine(metaField, context.sourceFile)}`,
    );
  }
  if (!itemsTypeNode) {
    throw new Error(
      `'items' member in metalist interface has no type at ${filenameAndLine(itemsField, context.sourceFile)}`,
    );
  }

  if (!ts.isTypeLiteralNode(metaTypeNode)) {
    throw new Error(
      `'meta' member in metalist interface must be a type literal at ${filenameAndLine(metaField, context.sourceFile)}`,
    );
  }
  if (!ts.isArrayTypeNode(itemsTypeNode)) {
    throw new Error(
      `'items' member in metalist interface must be an array type at ${filenameAndLine(itemsField, context.sourceFile)}`,
    );
  }

  const metaMembers = analyzeTypeLiteralNode(metaTypeNode, context);
  const itemType = analyzeElementTypeNode(itemsTypeNode.elementType, [], context, true);
  if (!itemType) {
    throw new Error(
      `Could not analyze element type for 'items' member in metalist interface at ${filenameAndLine(itemsField, context.sourceFile)}`,
    );
  }

  return {
    kind: "metalist",
    itemTag,
    metaMembers,
    itemType,
  };
}

function analyzeElementTypeNode<F extends boolean>(
  node: ts.TypeNode,
  args: string[] | undefined,
  context: FileAnalyzeContext,
  force: F,
): F extends true ? ElementSchemaInfo : ElementSchemaInfo | undefined {
  switch (args?.[0]) {
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
      let itemType: ElementSchemaInfo | IdentifierSchemaInfo | undefined;
      if (ts.isTypeReferenceNode(node.elementType)) {
        itemType = analyzeTypeReferenceNode(node.elementType, context);
      } else {
        itemType = analyzeElementTypeNode(node.elementType, [], context, true);
      }
      if (!itemType) {
        throw new Error(
          `Could not analyze element type for list at ${filenameAndLine(node, context.sourceFile)}`,
        );
      }
      return {
        kind: "list",
        itemTag,
        itemType,
      };

    case "metalist":
      throw new Error("Unimplemented");

    case "object":
    case undefined:
      if (!ts.isTypeLiteralNode(node)) {
        if (!force)
          return undefined as F extends true ? ElementSchemaInfo : ElementSchemaInfo | undefined;
        throw new Error(
          `Expected type literal for object, got ${node.getText(context.sourceFile)} at ${filenameAndLine(node, context.sourceFile)}`,
        );
      }
      return {
        kind: "object",
        members: analyzeTypeLiteralNode(node, context),
      };

    default:
      if (!force)
        return undefined as F extends true ? ElementSchemaInfo : ElementSchemaInfo | undefined;
      throw new Error(
        `Unknown schema marker argument: ${args?.[0]} at ${filenameAndLine(node, context.sourceFile)}`,
      );
  }
}

function analyzeTypeNode(
  node: ts.TypeNode,
  args: string[] | undefined,
  context: FileAnalyzeContext,
): SchemaTypeInfo {
  const elementType = analyzeElementTypeNode(node, args, context, false);
  if (elementType) {
    return elementType;
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
    return analyzeTypeReferenceNode(node, context);
  }

  if (ts.isArrayTypeNode(node)) {
    throw new Error(
      `Array types must be annotated with '// @xml-schema list "{itemTag}"' at ${filenameAndLine(node, context.sourceFile)}`,
    );
  }

  throw new Error(`Unsupported type at ${filenameAndLine(node, context.sourceFile)}`);
}

function analyzeTypeReferenceNode(
  node: ts.TypeReferenceNode,
  context: FileAnalyzeContext,
): IdentifierSchemaInfo {
  const typeName = node.typeName.getText(context.sourceFile);
  const sourceFile = getDefinitionSourceFile(node, context.checker);
  if (!sourceFile) {
    consola.warn(
      `Could not find source file for type reference ${typeName} at ${filenameAndLine(node, context.sourceFile)}`,
    );
  }
  const sourceFileName = sourceFile !== context.sourceFile ? sourceFile?.fileName : undefined;
  if (sourceFileName) {
    const relativePath = relativeImportPath(
      path.resolve(context.sourceFile.fileName),
      path.resolve(sourceFileName),
    );
    context.schemaImports.add(relativePath, typeName);
  }

  return {
    kind: "identifier",
    name: typeName,
    ...(sourceFileName ? { declaredFile: sourceFileName } : {}),
  };
}

function analyzeTypeLiteralNode(
  node: ts.TypeLiteralNode,
  context: FileAnalyzeContext,
): ObjectSchemaMemberInfo[] {
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

  return members;
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
