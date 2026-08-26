import {
  Application,
  ArrayType,
  Context,
  Converter,
  DeclarationReflection,
  IntrinsicType,
  ReferenceType,
  ReflectionFlag,
  ReflectionKind,
  ReflectionSymbolId,
  ReflectionType,
  type SomeType,
  TypeScript as ts,
  TypeOperatorType,
  UnionType,
} from "typedoc";

const XML_PACKAGE = "@sw-file-lib/xml";

export function load(app: Application) {
  let checker: ts.TypeChecker | undefined;
  const identifierIds = new WeakMap<ts.Identifier, ReflectionSymbolId>();
  const schemaToAlias = new Map<ReflectionSymbolId, DeclarationReflection>();
  const pending: {
    typeAlias: DeclarationReflection;
    schemaType: ts.Type;
    isImmutable: boolean;
  }[] = [];

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
    for (const { typeAlias, schemaType, isImmutable } of pending) {
      expandInfer(context, typeAlias, schemaType, isImmutable);
    }

    pending.length = 0;
    schemaToAlias.clear();
  });

  function collect(context: Context, refl: DeclarationReflection) {
    checker ??= context.checker;

    if (
      !refl.kindOf(ReflectionKind.TypeAlias) ||
      refl.type?.type !== "reference" ||
      refl.type.package !== XML_PACKAGE
    )
      return;

    const isInfer = refl.type.qualifiedName === "Infer";
    const isInferImmutable = refl.type.qualifiedName === "InferImmutable";

    if (!isInfer && !isInferImmutable) return;

    const schemaRef = refl.type.typeArguments?.[0]?.visit({
      query: (t) => t.queryType,
    });

    if (!(schemaRef?.reflection instanceof DeclarationReflection)) return;
    const schemaRefl = schemaRef.reflection;

    const symbol = getSymbol(context, schemaRefl);
    if (!symbol) return;

    const decl = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
    if (!decl) return;
    collectIdentifiers(context, decl);

    const symbolId = context.createSymbolId(symbol);

    schemaToAlias.set(symbolId, refl);

    const schemaType = context.checker.getTypeAtLocation(decl);
    pending.push({ typeAlias: refl, schemaType, isImmutable: isInferImmutable });
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

  function expandInfer(
    _context: Context,
    typeAlias: DeclarationReflection,
    schemaType: ts.Type,
    isImmutable: boolean,
  ) {
    if (!checker) return;

    typeAlias.type = convertSchema(
      { checker, typeAlias, identifierIds, schemaToAlias, isImmutable },
      schemaType,
    );
  }
}

function metaListType(
  typeAlias: DeclarationReflection,
  metaType: SomeType,
  itemType: SomeType,
): ReflectionType {
  const decl = new DeclarationReflection("__type", ReflectionKind.TypeLiteral, typeAlias);

  const metaProp = new DeclarationReflection("meta", ReflectionKind.Property, decl);
  const itemsProp = new DeclarationReflection("items", ReflectionKind.Property, decl);

  metaProp.type = metaType;
  itemsProp.type = new ArrayType(itemType);

  decl.children = [metaProp, itemsProp];

  return new ReflectionType(decl);
}

type SchemaExpression =
  | { kind: "identifier"; identifier: ts.Identifier }
  | { kind: "list"; item: SchemaExpression }
  | { kind: "union"; items: SchemaExpression[] }
  | { kind: "intrinsic"; name: "number" | "string" | "boolean" };

interface ConversionContext {
  checker: ts.TypeChecker;
  typeAlias: DeclarationReflection;
  identifierIds: WeakMap<ts.Identifier, ReflectionSymbolId>;
  schemaToAlias: Map<ReflectionSymbolId, DeclarationReflection>;
  isImmutable: boolean;
}

function classifySchemaExpression(expr: ts.Expression): SchemaExpression | undefined {
  let current = expr;

  // Strip trailing .optional() calls only
  while (ts.isCallExpression(current)) {
    const target = current.expression;
    if (ts.isPropertyAccessExpression(target) && target.name.text === "optional") {
      current = target.expression;
      continue;
    }
    break;
  }

  if (ts.isIdentifier(current)) {
    return { kind: "identifier", identifier: current };
  }

  // x.number() / x.string() / x.boolean() / x.list(...) / x.union(...)
  if (ts.isCallExpression(current)) {
    const target = current.expression;
    if (!ts.isPropertyAccessExpression(target) || !ts.isIdentifier(target.expression)) return;

    switch (target.name.text) {
      case "number":
      case "string":
      case "boolean":
        return { kind: "intrinsic", name: target.name.text };
      case "list":
        const item = current.arguments[1];
        if (!item) return;
        const c = classifySchemaExpression(item);
        if (!c) return;
        return { kind: "list", item: c };
      case "union":
        const items = current.arguments[0];
        if (!items) return;
        if (!ts.isArrayLiteralExpression(items)) return;
        const c2 = items.elements.map((e) => classifySchemaExpression(e));
        if (c2.some((e) => e === undefined)) return;
        return { kind: "union", items: c2 as SchemaExpression[] };
    }
  }
}

function identifierToAliasType(
  ctx: Readonly<ConversionContext>,
  ident: ts.Identifier,
): ReferenceType | undefined {
  const id = ctx.identifierIds.get(ident);
  if (!id) {
    return;
  }
  const alias = ctx.schemaToAlias.get(id);
  if (!alias) return;
  return ReferenceType.createResolvedReference(alias.name, alias, ctx.typeAlias.project);
}

function schemaExpressionToType(
  ctx: Readonly<ConversionContext>,
  expr: SchemaExpression,
): SomeType | undefined {
  switch (expr.kind) {
    case "identifier": {
      return identifierToAliasType(ctx, expr.identifier);
    }
    case "list": {
      const itemType = schemaExpressionToType(ctx, expr.item);
      if (!itemType) return;
      return new ArrayType(itemType);
    }
    case "union": {
      const itemTypes = expr.items.map((item) => schemaExpressionToType(ctx, item));
      if (itemTypes.some((t) => t === undefined)) return;
      return new UnionType(itemTypes as SomeType[]);
    }
    case "intrinsic": {
      return new IntrinsicType(expr.name);
    }
  }
}

function convertSchema(
  ctx: Readonly<ConversionContext>,
  type: ts.Type,
  initializer?: ts.Expression,
): SomeType {
  const typeStr = ctx.checker.typeToString(type);

  // primitive schemas
  switch (typeStr) {
    case "NumberSchema":
      return new IntrinsicType("number");
    case "StringSchema":
      return new IntrinsicType("string");
    case "BooleanSchema":
      return new IntrinsicType("boolean");
  }

  if (initializer) {
    const c = classifySchemaExpression(initializer);
    if (c) {
      const t = schemaExpressionToType(ctx, c);
      if (t) return t;
    }
  }

  // ObjectListSchema<T extends Shape>
  if (isTypeReference(type, "ObjectListSchema")) {
    const inner = (type as ts.TypeReference).typeArguments?.[0];
    const arrayType = new ArrayType(
      inner ? convertShape(ctx, inner) : new IntrinsicType("unknown"),
    );
    if (ctx.isImmutable) {
      return new TypeOperatorType(arrayType, "readonly");
    } else {
      return arrayType;
    }
  }

  // ListSchema<T extends ElementSchema>
  if (isTypeReference(type, "ListSchema")) {
    const inner = (type as ts.TypeReference).typeArguments?.[0];
    const arrayType = new ArrayType(
      inner ? convertSchema(ctx, inner) : new IntrinsicType("unknown"),
    );
    if (ctx.isImmutable) {
      return new TypeOperatorType(arrayType, "readonly");
    } else {
      return arrayType;
    }
  }

  // ObjectMetaListSchema<T extends Shape>
  if (isTypeReference(type, "ObjectMetaListSchema")) {
    const inner0 = (type as ts.TypeReference).typeArguments?.[0];
    const inner1 = (type as ts.TypeReference).typeArguments?.[1];
    const metaList = metaListType(
      ctx.typeAlias,
      inner0 ? convertShape(ctx, inner0) : new IntrinsicType("unknown"),
      inner1 ? convertShape(ctx, inner1) : new IntrinsicType("unknown"),
    );
    if (ctx.isImmutable) {
      return new TypeOperatorType(metaList, "readonly");
    } else {
      return metaList;
    }
  }

  // MetaListSchema<T extends ElementSchema>
  if (isTypeReference(type, "MetaListSchema")) {
    const inner0 = (type as ts.TypeReference).typeArguments?.[0];
    const inner1 = (type as ts.TypeReference).typeArguments?.[1];
    const metaList = metaListType(
      ctx.typeAlias,
      inner0 ? convertShape(ctx, inner0) : new IntrinsicType("unknown"),
      inner1 ? convertSchema(ctx, inner1) : new IntrinsicType("unknown"),
    );
    if (ctx.isImmutable) {
      return new TypeOperatorType(metaList, "readonly");
    } else {
      return metaList;
    }
  }

  // OptionalSchema<T>
  if (isTypeReference(type, "OptionalSchema")) {
    const inner = (type as ts.TypeReference).typeArguments?.[0];
    return inner ? convertSchema(ctx, inner) : new IntrinsicType("unknown");
  }

  // UnionSchema<[...]>
  if (isTypeReference(type, "UnionSchema")) {
    const tuple = (type as ts.TypeReference).typeArguments?.[0];
    if (tuple && ctx.checker.isTupleType(tuple)) {
      const parts = (tuple as ts.TypeReference).typeArguments ?? [];
      return new UnionType(parts.map((t) => convertSchema(ctx, t)));
    }
  }

  // ObjectSchema<T>
  if (isTypeReference(type, "ObjectSchema")) {
    const shape = (type as ts.TypeReference).typeArguments?.[0];
    if (shape) return convertShape(ctx, shape);
  }

  return new IntrinsicType("unknown");
}

function convertShape(ctx: Readonly<ConversionContext>, shape: ts.Type): ReflectionType {
  const decl = new DeclarationReflection("__type", ReflectionKind.TypeLiteral, ctx.typeAlias);

  decl.children = shape.getProperties().map((prop) => {
    const root = ctx.checker.getRootSymbols(prop)[0] ?? prop;
    const valueDecl = root.valueDeclaration ?? root.declarations?.[0];

    const propType = ctx.checker.getTypeOfSymbol(prop);

    let initializer: ts.Expression | undefined;
    if (valueDecl && ts.isPropertyAssignment(valueDecl)) {
      initializer = valueDecl.initializer;
    }

    const member = new DeclarationReflection(prop.name, ReflectionKind.Property, decl);

    if (isTypeReference(propType, "OptionalSchema")) {
      member.flags.setFlag(ReflectionFlag.Optional, true);

      const valueType = (propType as ts.TypeReference).typeArguments?.[0];
      member.type = valueType
        ? convertSchema(ctx, valueType, initializer)
        : new IntrinsicType("unknown");
    } else {
      member.type = convertSchema(ctx, propType, initializer);
    }

    member.flags.setFlag(ReflectionFlag.Readonly, ctx.isImmutable);

    return member;
  });

  return new ReflectionType(decl);
}

function isTypeReference(type: ts.Type, target: string): boolean {
  if (!(type.flags & ts.TypeFlags.Object)) return false;

  const symbol = type.getSymbol();
  return symbol?.getName() === target;
}

function getSymbol(context: Context, refl: DeclarationReflection): ts.Symbol | undefined {
  if ("getSymbolFromReflection" in context) {
    return context.getSymbolFromReflection(refl);
  }

  return (refl.project as any).getSymbolFromReflection(refl);
}
