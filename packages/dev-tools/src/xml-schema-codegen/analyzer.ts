import path from "node:path";
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
import { loc, relativeImportPath, SetMap } from "./utils";

interface FileAnalyzeContext {
  checker: ts.TypeChecker;
  sourceFile: ts.SourceFile;
  schemaImports: SetMap<string, string>;
  inputPaths: ReadonlySet<string>;
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
    inputPaths: new Set(options.input.map((file) => path.resolve(file))),
  };

  const schemas: SchemaDeclarationInfo[] = [];

  function visit(node: ts.Node) {
    if (ts.isInterfaceDeclaration(node)) {
      const args = parseXmlSchemaMarker(node, sourceFile);
      if (args) {
        const info = analyzeInterfaceNode(node, args, context);
        schemas.push(info);
      }
    } else if (ts.isStatement(node) && parseXmlSchemaMarker(node, sourceFile)) {
      throw new Error(
        `Only interface declarations support @xml-schema at ${loc(node, sourceFile)}`,
      );
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
  validateInterface(node);
  if ((context.checker.getSymbolAtLocation(node.name)?.declarations?.length ?? 0) > 1)
    throw new Error(
      `Merged interface declarations are unsupported at ${loc(node, context.sourceFile)}`,
    );
  validateMarker(node, args, context.sourceFile);

  let schema: ElementSchemaInfo;

  const firstArg = args[0];
  switch (args[0]) {
    case "list":
      throw new Error(
        `List interface declarations are unsupported at ${loc(node, context.sourceFile)}`,
      );
    case "metalist":
      const itemTag = args[1];
      if (!itemTag) {
        throw new Error(`Missing item tag for metalist type at ${loc(node, context.sourceFile)}`);
      }
      schema = analyzeMetalistInterfaceNode(node, itemTag, context);
      break;

    case "object":
    case undefined:
      schema = analyzeObjectInterfaceNode(node, context);
      break;

    default:
      throw new Error(
        `Unknown schema marker argument: ${firstArg} at ${loc(node, context.sourceFile)}`,
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
    validateProperty(m, context.sourceFile);

    const memberName = m.name.getText(context.sourceFile);
    const optional = !!m.questionToken;
    const typeNode = m.type;

    if (!typeNode) {
      throw new Error(`Property ${memberName} has no type at ${loc(m, context.sourceFile)}`);
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
    validateProperty(m, context.sourceFile);
    const memberName = m.name?.getText(context.sourceFile);

    switch (memberName) {
      case "meta":
        if (metaField) throw new Error(`Duplicate meta member at ${loc(m, context.sourceFile)}`);
        metaField = m;
        break;
      case "items":
        if (itemsField) throw new Error(`Duplicate items member at ${loc(m, context.sourceFile)}`);
        itemsField = m;
        break;
      default:
        throw new Error(
          `Unexpected member ${memberName} in metalist interface at ${loc(m, context.sourceFile)}`,
        );
    }
  }

  if (!metaField) {
    throw new Error(
      `Missing 'meta' member in metalist interface at ${loc(node, context.sourceFile)}`,
    );
  }
  if (!itemsField) {
    throw new Error(
      `Missing 'items' member in metalist interface at ${loc(node, context.sourceFile)}`,
    );
  }
  if (metaField.questionToken) {
    throw new Error(
      `'meta' member in metalist interface cannot be optional at ${loc(metaField, context.sourceFile)}`,
    );
  }
  if (itemsField.questionToken) {
    throw new Error(
      `'items' member in metalist interface cannot be optional at ${loc(itemsField, context.sourceFile)}`,
    );
  }
  if (!ts.isPropertySignature(metaField) || !ts.isPropertySignature(itemsField)) {
    throw new Error(
      `Members 'meta' and 'items' in metalist interface must be property signatures at ${loc(
        node,
        context.sourceFile,
      )}`,
    );
  }

  const metaTypeNode = metaField.type;
  const itemsTypeNode = itemsField.type;

  if (!metaTypeNode) {
    throw new Error(
      `'meta' member in metalist interface has no type at ${loc(metaField, context.sourceFile)}`,
    );
  }
  if (!itemsTypeNode) {
    throw new Error(
      `'items' member in metalist interface has no type at ${loc(itemsField, context.sourceFile)}`,
    );
  }

  if (!ts.isTypeLiteralNode(metaTypeNode)) {
    throw new Error(
      `'meta' member in metalist interface must be a type literal at ${loc(metaField, context.sourceFile)}`,
    );
  }
  if (!ts.isArrayTypeNode(itemsTypeNode)) {
    throw new Error(
      `'items' member in metalist interface must be an array type at ${loc(itemsField, context.sourceFile)}`,
    );
  }

  const metaMembers = analyzeTypeLiteralNode(metaTypeNode, context);
  const itemType = ts.isTypeReferenceNode(itemsTypeNode.elementType)
    ? analyzeTypeReferenceNode(itemsTypeNode.elementType, context)
    : analyzeElementTypeNode(itemsTypeNode.elementType, [], context, true);
  if (!itemType) {
    throw new Error(
      `Could not analyze element type for 'items' member in metalist interface at ${loc(itemsField, context.sourceFile)}`,
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
  validateMarker(node, args, context.sourceFile);
  switch (args?.[0]) {
    case "list":
      if (!ts.isArrayTypeNode(node)) {
        throw new Error(
          `Expected array type for list, got ${node.getText(context.sourceFile)} at ${loc(node, context.sourceFile)}`,
        );
      }
      const itemTag = args[1];
      if (!itemTag) {
        throw new Error(`Missing item tag for list type at ${loc(node, context.sourceFile)}`);
      }
      let itemType: ElementSchemaInfo | IdentifierSchemaInfo | undefined;
      if (ts.isTypeReferenceNode(node.elementType)) {
        itemType = analyzeTypeReferenceNode(node.elementType, context);
      } else {
        itemType = analyzeElementTypeNode(node.elementType, [], context, true);
      }
      if (!itemType) {
        throw new Error(
          `Could not analyze element type for list at ${loc(node, context.sourceFile)}`,
        );
      }
      return {
        kind: "list",
        itemTag,
        itemType,
      };

    case "metalist":
      throw new Error(
        `Inline metalist markers are unsupported at ${loc(node, context.sourceFile)}`,
      );

    case "object":
    case undefined:
      if (!ts.isTypeLiteralNode(node)) {
        if (!force && args?.[0] !== "object")
          return undefined as F extends true ? ElementSchemaInfo : ElementSchemaInfo | undefined;
        throw new Error(
          `Expected type literal for object, got ${node.getText(context.sourceFile)} at ${loc(node, context.sourceFile)}`,
        );
      }
      return {
        kind: "object",
        members: analyzeTypeLiteralNode(node, context),
      };

    default:
      throw new Error(
        `Unknown schema marker argument: ${args?.[0]} at ${loc(node, context.sourceFile)}`,
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
      `Array types must be annotated with '// @xml-schema list "{itemTag}"' at ${loc(node, context.sourceFile)}`,
    );
  }

  throw new Error(
    `Unsupported type ${node.getText(context.sourceFile)} at ${loc(node, context.sourceFile)}`,
  );
}

function analyzeTypeReferenceNode(
  node: ts.TypeReferenceNode,
  context: FileAnalyzeContext,
): IdentifierSchemaInfo {
  const typeName = node.typeName.getText(context.sourceFile);
  const fail = (reason: string): never => {
    throw new Error(
      `${reason}: ${node.getText(context.sourceFile)} at ${loc(node, context.sourceFile)}`,
    );
  };
  if (node.typeArguments?.length) fail("Generic type references are unsupported");
  if (!ts.isIdentifier(node.typeName)) fail("Qualified type references are unsupported");
  const symbol = context.checker.getSymbolAtLocation(node.typeName);
  if (!symbol) return fail("Unresolved type reference");
  const target =
    symbol.flags & ts.SymbolFlags.Alias ? context.checker.getAliasedSymbol(symbol) : symbol;
  const declarations = target.declarations;
  if (!declarations?.length) return fail("Unresolved type reference");
  if (declarations.length !== 1) return fail("Merged type declarations are unsupported");
  const declaration = declarations[0]!;
  if (!ts.isInterfaceDeclaration(declaration))
    return fail("Type reference must target a marked interface");
  validateInterface(declaration);
  const sourceFile = declaration.getSourceFile();
  if (sourceFile.isDeclarationFile || !context.inputPaths.has(path.resolve(sourceFile.fileName)))
    fail("Referenced interface is not a generation input");
  if (!parseXmlSchemaMarker(declaration, sourceFile))
    fail("Referenced interface has no @xml-schema marker");
  if (declaration.name.text !== typeName) fail("Renamed type references are unsupported");
  const sourceFileName = sourceFile !== context.sourceFile ? sourceFile.fileName : undefined;
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
    validateProperty(m, context.sourceFile);

    const memberName = m.name.getText(context.sourceFile);
    const optional = !!m.questionToken;
    const typeNode = m.type;

    if (!typeNode) {
      throw new Error(`Property ${memberName} has no type at ${loc(node, context.sourceFile)}`);
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

function validateInterface(node: ts.InterfaceDeclaration): void {
  const sourceFile = node.getSourceFile();
  if (!ts.isSourceFile(node.parent))
    throw new Error(`Nested interface declarations are unsupported at ${loc(node, sourceFile)}`);
  if (node.typeParameters?.length)
    throw new Error(`Generic interface declarations are unsupported at ${loc(node, sourceFile)}`);
  if (node.heritageClauses?.length)
    throw new Error(`Interface inheritance is unsupported at ${loc(node, sourceFile)}`);
  if (node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword))
    throw new Error(`Default interface exports are unsupported at ${loc(node, sourceFile)}`);
}

function validateProperty(
  node: ts.TypeElement,
  sourceFile: ts.SourceFile,
): asserts node is ts.PropertySignature {
  if (!ts.isPropertySignature(node))
    throw new Error(
      `Unsupported interface member ${node.getText(sourceFile)} at ${loc(node, sourceFile)}`,
    );
  if (ts.isComputedPropertyName(node.name))
    throw new Error(`Computed property names are unsupported at ${loc(node, sourceFile)}`);
}

function validateMarker(
  node: ts.Node,
  args: string[] | undefined,
  sourceFile: ts.SourceFile,
): void {
  if (!args?.length) return;
  const expected =
    args[0] === "object" ? 1 : args[0] === "list" || args[0] === "metalist" ? 2 : undefined;
  if (expected === undefined)
    throw new Error(`Unknown schema marker argument: ${args[0]} at ${loc(node, sourceFile)}`);
  if (args.length > expected)
    throw new Error(`Unexpected schema marker arguments at ${loc(node, sourceFile)}`);
}
