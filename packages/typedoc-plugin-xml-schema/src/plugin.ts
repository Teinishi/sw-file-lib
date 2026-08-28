import {
  Context,
  Converter,
  DeclarationReflection,
  ReflectionKind,
  type Application,
  TypeScript as ts,
  ReflectionSymbolId,
  ContainerReflection,
  ReferenceType,
  ReflectionFlag,
  type SomeType,
  IntrinsicType,
  ReflectionType,
  ArrayType,
  UnionType,
  TypeOperatorType,
  ProjectReflection,
} from "typedoc";

const XML_PACKAGE = "@sw-file-lib/xml";

interface InterfaceDeclaration {
  declarationRefl: DeclarationReflection;
  schemaRef: ReferenceType;
  schemaDecl: ts.VariableDeclaration;
  isImmutable: boolean;
}

interface ConversionContext {
  context: Context;
  interfaceRefl: DeclarationReflection;
  identifierIds: WeakMap<ts.Identifier, ReflectionSymbolId>;
  schemaToAlias: Map<ReflectionSymbolId, DeclarationReflection>;
  schemaToAliasImmutable: Map<ReflectionSymbolId, DeclarationReflection>;
  isImmutable: boolean;
}

interface ObjectSchemaProperty {
  key: string;
  value: SchemaTreeNode;
  isOptional: boolean;
}

type SchemaTreeNode =
  | { type: "identifier"; identifier: ts.Identifier }
  | { type: "intrinsic"; name: string }
  | { type: "object"; properties: ObjectSchemaProperty[] }
  | { type: "list"; itemType: SchemaTreeNode }
  | { type: "metalist"; metaType: SchemaTreeNode; itemType: SchemaTreeNode }
  | { type: "union"; types: SchemaTreeNode[] };

export function load(app: Application) {
  const identifierIds = new WeakMap<ts.Identifier, ReflectionSymbolId>();
  const schemaToAlias = new Map<ReflectionSymbolId, DeclarationReflection>();
  const schemaToAliasImmutable = new Map<ReflectionSymbolId, DeclarationReflection>();
  const interfaceDeclarations: InterfaceDeclaration[] = [];

  app.converter.on(
    Converter.EVENT_CREATE_DECLARATION,
    (context: Context, refl: DeclarationReflection) => {
      if ("deferConversion" in context.converter) {
        context.converter.deferConversion(() => collect(context, refl));
      } else {
        collect(context, refl);
      }
    },
  );

  app.converter.on(Converter.EVENT_RESOLVE_BEGIN, (context: Context) => {
    for (const interfaceDecl of interfaceDeclarations) {
      const success = expandInferOnInterface(
        {
          context,
          interfaceRefl: interfaceDecl.declarationRefl,
          identifierIds,
          schemaToAlias,
          schemaToAliasImmutable,
          isImmutable: interfaceDecl.isImmutable,
        },
        interfaceDecl,
      );
      if (!success) {
        console.log("Skipped expanding Infer on interface:", interfaceDecl.declarationRefl.name);
      }
    }

    interfaceDeclarations.length = 0;
    schemaToAlias.clear();
    schemaToAliasImmutable.clear();
  });

  function collect(context: Context, refl: DeclarationReflection) {
    if (!refl.kindOf(ReflectionKind.Interface)) return;

    if (refl.extendedTypes?.length !== 1) return;
    const ext = refl.extendedTypes[0]!;
    if (ext.type !== "reference" || ext.package !== XML_PACKAGE) return;

    const isInfer = ext.qualifiedName === "Infer";
    const isInferImmutable = ext.qualifiedName === "InferImmutable";
    if (!isInfer && !isInferImmutable) return;

    const schemaRef = ext.typeArguments?.[0]?.visit({ query: (t) => t.queryType });
    if (!(schemaRef?.reflection instanceof DeclarationReflection)) return;

    // schema 定義で使われている symbol の ReflectionSymbolId をすべて集める
    // EVENT_RESOLVE_BEGIN で context.createSymbolId に触れないため、事前に集めておく必要がある
    const symbol = getSymbol(context, schemaRef.reflection);
    if (!symbol) return;
    const decl = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
    if (!decl || !ts.isVariableDeclaration(decl)) return;
    collectIdentifiers(context, decl);

    // schema からそれを Infer した interface を逆引きできるようにしておく
    const symbolId = context.createSymbolId(symbol);
    if (isInferImmutable) {
      schemaToAliasImmutable.set(symbolId, refl);
    } else {
      schemaToAlias.set(symbolId, refl);
    }

    interfaceDeclarations.push({
      declarationRefl: refl,
      schemaRef,
      schemaDecl: decl,
      isImmutable: isInferImmutable,
    });
  }

  function collectIdentifiers(context: Context, node: ts.Node) {
    if (ts.isIdentifier(node)) {
      const symbol = context.checker.getSymbolAtLocation(node);
      if (symbol) {
        identifierIds.set(node, context.createSymbolId(context.resolveAliasedSymbol(symbol)));
      }
    }

    node.forEachChild((child) => collectIdentifiers(context, child));
  }
}

function getSymbol(context: Context, refl: DeclarationReflection): ts.Symbol | undefined {
  if ("getSymbolFromReflection" in context) {
    return context.getSymbolFromReflection(refl);
  }

  return (refl.project as any).getSymbolFromReflection(refl);
}

function expandInferOnInterface(
  ctx: ConversionContext,
  interfaceDecl: InterfaceDeclaration,
): boolean {
  const { initializer } = interfaceDecl.schemaDecl;
  if (!initializer) return false;

  const schemaData = convertSchemaAST(ctx, initializer);
  if (!schemaData) return false;

  let propDecls: DeclarationReflection[] | undefined;
  switch (schemaData.node.type) {
    case "object":
      propDecls = convertSchemaTreeObjectNodeToType(ctx, schemaData.node.properties);
      break;
    case "metalist":
      propDecls = convertSchemaTreeMetalistNodeToType(
        ctx,
        schemaData.node.metaType,
        schemaData.node.itemType,
      );
      break;
  }
  if (!propDecls) return false;

  for (const propDecl of propDecls) {
    replaceChild(interfaceDecl.declarationRefl, propDecl.name, propDecl, ctx.interfaceRefl.project);
  }

  delete interfaceDecl.declarationRefl.extendedTypes;
  return true;
}

function replaceChild(
  parent: ContainerReflection,
  key: string,
  newChild: DeclarationReflection,
  project: ProjectReflection,
) {
  const oldChild = parent.children?.find((c) => c.name === key);
  if (oldChild) {
    parent.removeChild(oldChild);
    project.removeReflection(oldChild);
  }
  parent.addChild(newChild);
}

function convertSchemaTreeNodeToType(
  ctx: ConversionContext,
  name: string,
  node: SchemaTreeNode,
): SomeType | undefined {
  switch (node.type) {
    case "identifier":
      const symbolId = ctx.identifierIds.get(node.identifier);
      if (!symbolId) return;
      const alias = ctx.isImmutable
        ? ctx.schemaToAliasImmutable.get(symbolId)
        : ctx.schemaToAlias.get(symbolId);
      if (!alias) return;
      return ReferenceType.createResolvedReference(alias.name, alias, ctx.interfaceRefl.project);
    case "intrinsic":
      return new IntrinsicType(node.name);
    case "object":
      const objectDecl = ctx.context.createDeclarationReflection(
        ReflectionKind.Interface,
        undefined,
        undefined,
        name,
      );
      const objectPropDecls = convertSchemaTreeObjectNodeToType(ctx, node.properties);
      if (!objectPropDecls) return;
      for (const propDecl of objectPropDecls) {
        objectDecl.addChild(propDecl);
      }
      return new ReflectionType(objectDecl);
    case "list":
      const itemType = convertSchemaTreeNodeToType(ctx, name, node.itemType);
      if (!itemType) return;
      return createArrayType(itemType, ctx.isImmutable);
    case "metalist":
      const metalistDecl = ctx.context.createDeclarationReflection(
        ReflectionKind.Interface,
        undefined,
        undefined,
        name,
      );
      const metalistPropDecls = convertSchemaTreeMetalistNodeToType(
        ctx,
        node.metaType,
        node.itemType,
      );
      if (!metalistPropDecls) return;
      for (const propDecl of metalistPropDecls) {
        metalistDecl.addChild(propDecl);
      }
      return new ReflectionType(metalistDecl);
    case "union":
      const unionTypes: SomeType[] = [];
      for (const typeNode of node.types) {
        const type = convertSchemaTreeNodeToType(ctx, name, typeNode);
        if (!type) return;
        unionTypes.push(type);
      }
      return new UnionType(unionTypes);
    default:
      node satisfies never;
  }
}

function convertSchemaTreeObjectNodeToType(
  ctx: ConversionContext,
  props: ObjectSchemaProperty[],
): DeclarationReflection[] | undefined {
  const propDecls: DeclarationReflection[] = [];
  for (const prop of props) {
    const propType = convertSchemaTreeNodeToType(ctx, prop.key, prop.value);
    if (!propType) return;
    const propRefl = ctx.context.createDeclarationReflection(
      ReflectionKind.Property,
      undefined,
      undefined,
      prop.key,
    );
    propRefl.type = propType;
    propRefl.flags.setFlag(ReflectionFlag.Optional, prop.isOptional);
    propRefl.flags.setFlag(ReflectionFlag.Readonly, ctx.isImmutable);
    propDecls.push(propRefl);
  }
  return propDecls;
}

function convertSchemaTreeMetalistNodeToType(
  ctx: ConversionContext,
  metaNode: SchemaTreeNode,
  itemNode: SchemaTreeNode,
): DeclarationReflection[] | undefined {
  const propDecls: DeclarationReflection[] = [];

  const metaRefl = ctx.context.createDeclarationReflection(
    ReflectionKind.Property,
    undefined,
    undefined,
    "meta",
  );
  const metaType = convertSchemaTreeNodeToType(ctx, "meta", metaNode);
  if (!metaType) return;
  metaRefl.type = metaType;
  propDecls.push(metaRefl);

  const itemsRefl = ctx.context.createDeclarationReflection(
    ReflectionKind.Property,
    undefined,
    undefined,
    "items",
  );
  const itemType = convertSchemaTreeNodeToType(ctx, "items", itemNode);
  if (!itemType) return;
  itemsRefl.type = createArrayType(itemType, ctx.isImmutable);
  propDecls.push(itemsRefl);

  return propDecls;
}

function createArrayType(itemType: SomeType, isReadonly: boolean): ArrayType | TypeOperatorType {
  const arrayType = new ArrayType(itemType);
  if (isReadonly) {
    return new TypeOperatorType(arrayType, "readonly");
  } else {
    return arrayType;
  }
}

function convertSchemaAST(
  ctx: ConversionContext,
  expr: ts.Expression,
): { node: SchemaTreeNode; isOptional: boolean } | undefined {
  const { expr: strippedExpr, isOptional } = stripTrailingCall(expr);

  if (ts.isIdentifier(strippedExpr))
    return { node: { type: "identifier", identifier: strippedExpr }, isOptional };

  if (!ts.isCallExpression(strippedExpr)) return;

  const rightMostIdentifier = getRightMostIdentifier(strippedExpr.expression);
  if (!rightMostIdentifier) return;
  const rightMostIdentifierId = ctx.identifierIds.get(rightMostIdentifier);
  if (!rightMostIdentifierId || rightMostIdentifierId.packageName !== XML_PACKAGE) return;

  const arg0 = strippedExpr.arguments[0];
  const arg1 = strippedExpr.arguments[1];
  const arg2 = strippedExpr.arguments[2];

  switch (rightMostIdentifier.text) {
    case "string":
    case "number":
    case "boolean":
      return { node: { type: "intrinsic", name: rightMostIdentifier.text }, isOptional };
    case "object":
      if (!arg0) return;
      const objectProps = convertObjectLiteral(ctx, arg0, false);
      if (!objectProps) return;
      return { node: { type: "object", properties: objectProps }, isOptional };
    case "partialObject":
      if (!arg0) return;
      const partialObjectProps = convertObjectLiteral(ctx, arg0, true);
      if (!partialObjectProps) return;
      return { node: { type: "object", properties: partialObjectProps }, isOptional };
    case "list":
      if (!arg1) return;
      const listItemType = convertSchemaAST(ctx, arg1);
      if (!listItemType) return;
      return { node: { type: "list", itemType: listItemType.node }, isOptional };
    case "metalist":
      if (!arg1 || !arg2) return;
      const metaListMetaType = convertSchemaAST(ctx, arg1);
      const metaListItemType = convertSchemaAST(ctx, arg2);
      if (!metaListMetaType || !metaListItemType) return;
      return {
        node: {
          type: "metalist",
          metaType: metaListMetaType.node,
          itemType: metaListItemType.node,
        },
        isOptional,
      };
    case "union":
      if (!arg0 || !ts.isArrayLiteralExpression(arg0)) return;
      const unionTypes: SchemaTreeNode[] = [];
      for (const arg of arg0.elements) {
        const unionType = convertSchemaAST(ctx, arg);
        if (!unionType) return;
        unionTypes.push(unionType.node);
      }
      return { node: { type: "union", types: unionTypes }, isOptional };
  }
}

function stripTrailingCall(expr: ts.Expression): { expr: ts.Expression; isOptional: boolean } {
  let isOptional = false;
  while (ts.isCallExpression(expr)) {
    const target = expr.expression;
    if (ts.isPropertyAccessExpression(target) && target.name.text === "optional") {
      expr = target.expression;
      isOptional = true;
    } else {
      break;
    }
  }
  return { expr, isOptional };
}

function getRightMostIdentifier(expr: ts.Expression): ts.Identifier | undefined {
  if (ts.isIdentifier(expr)) return expr;

  if (ts.isPropertyAccessExpression(expr)) {
    return getRightMostIdentifier(expr.name);
  }
}

function convertObjectLiteral(
  ctx: ConversionContext,
  expr: ts.Expression,
  isPartial: boolean,
): ObjectSchemaProperty[] | undefined {
  if (!ts.isObjectLiteralExpression(expr)) return;

  const properties: ObjectSchemaProperty[] = [];
  for (const prop of expr.properties) {
    if (!ts.isPropertyAssignment(prop)) return;
    const value = convertSchemaAST(ctx, prop.initializer);
    if (!value) return;
    const key = getPropertyKey(prop);
    if (!key) return;
    properties.push({
      key,
      value: value.node,
      isOptional: isPartial || value.isOptional,
    });
  }
  return properties;
}

function getPropertyKey(prop: ts.PropertyAssignment): string | undefined {
  if (ts.isIdentifier(prop.name)) {
    return prop.name.text;
  }
  if (ts.isStringLiteral(prop.name)) {
    return prop.name.text;
  }
  if (ts.isNoSubstitutionTemplateLiteral(prop.name)) {
    return prop.name.text;
  }
  if (ts.isNumericLiteral(prop.name)) {
    return prop.name.text;
  }
  if (ts.isBigIntLiteral(prop.name)) {
    return prop.name.text;
  }
}
