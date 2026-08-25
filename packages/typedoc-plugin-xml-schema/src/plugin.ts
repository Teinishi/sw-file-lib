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
  ReflectionType,
  type SomeType,
  TypeScript as ts,
  UnionType,
} from "typedoc";

const XML_PACKAGE = "@sw-file-lib/xml";

export function load(app: Application) {
  let checker: ts.TypeChecker | undefined;
  const schemaToAlias = new Map<ts.Symbol, DeclarationReflection>();
  const pending: { typeAlias: DeclarationReflection; schemaType: ts.Type }[] = [];

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
    for (const { typeAlias, schemaType } of pending) {
      expandInfer(context, typeAlias, schemaType);
    }

    pending.length = 0;
    schemaToAlias.clear();
  });

  function collect(context: Context, refl: DeclarationReflection) {
    checker ??= context.checker;

    // todo: InferImmutable 対応
    if (
      refl.kindOf(ReflectionKind.TypeAlias) &&
      refl.type?.type === "reference" &&
      refl.type.package === XML_PACKAGE &&
      refl.type.qualifiedName === "Infer"
    ) {
      const schemaRef = refl.type.typeArguments?.[0]?.visit({
        query: (t) => t.queryType,
      });

      if (!(schemaRef?.reflection instanceof DeclarationReflection)) return;
      const schemaRefl = schemaRef.reflection;

      const symbol = getSymbol(context, schemaRefl);
      if (!symbol) return;

      schemaToAlias.set(symbol, refl);

      const decl = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
      if (!decl) return;
      const schemaType = context.checker.getTypeAtLocation(decl);
      pending.push({ typeAlias: refl, schemaType });
    }
  }

  function expandInfer(_context: Context, typeAlias: DeclarationReflection, schemaType: ts.Type) {
    if (!checker) return;

    typeAlias.type = convertSchema(checker, typeAlias, schemaType, schemaToAlias);
  }
}

function convertSchema(
  checker: ts.TypeChecker,
  typeAlias: DeclarationReflection,
  type: ts.Type,
  aliases: Map<ts.Symbol, DeclarationReflection>,
): SomeType {
  const typeStr = checker.typeToString(type);

  // primitive schemas
  switch (typeStr) {
    case "NumberSchema":
      return new IntrinsicType("number");
    case "StringSchema":
      return new IntrinsicType("string");
    case "BooleanSchema":
      return new IntrinsicType("boolean");
  }

  // ObjectListSchema<T extends Shape>
  if (isTypeReference(type, "ObjectListSchema")) {
    const inner = (type as ts.TypeReference).typeArguments?.[0];
    return new ArrayType(
      inner ? convertShape(checker, typeAlias, inner, aliases) : new IntrinsicType("unknown"),
    );
  }

  // ListSchema<T extends ElementSchema>
  if (isTypeReference(type, "ListSchema")) {
    const inner = (type as ts.TypeReference).typeArguments?.[0];
    return new ArrayType(
      inner ? convertSchema(checker, typeAlias, inner, aliases) : new IntrinsicType("unknown"),
    );
  }

  // ObjectMetaListSchema<T extends Shape>
  if (isTypeReference(type, "ObjectMetaListSchema")) {
    const inner0 = (type as ts.TypeReference).typeArguments?.[0];
    const inner1 = (type as ts.TypeReference).typeArguments?.[1];
    return metaListType(
      typeAlias,
      inner0 ? convertShape(checker, typeAlias, inner0, aliases) : new IntrinsicType("unknown"),
      inner1 ? convertShape(checker, typeAlias, inner1, aliases) : new IntrinsicType("unknown"),
    );
  }

  // MetaListSchema<T extends ElementSchema>
  if (isTypeReference(type, "MetaListSchema")) {
    const inner0 = (type as ts.TypeReference).typeArguments?.[0];
    const inner1 = (type as ts.TypeReference).typeArguments?.[1];
    return metaListType(
      typeAlias,
      inner0 ? convertShape(checker, typeAlias, inner0, aliases) : new IntrinsicType("unknown"),
      inner1 ? convertSchema(checker, typeAlias, inner1, aliases) : new IntrinsicType("unknown"),
    );
  }

  // OptionalSchema<T>
  if (isTypeReference(type, "OptionalSchema")) {
    const inner = (type as ts.TypeReference).typeArguments?.[0];
    return inner ? convertSchema(checker, typeAlias, inner, aliases) : new IntrinsicType("unknown");
  }

  // UnionSchema<[...]>
  if (isTypeReference(type, "UnionSchema")) {
    const tuple = (type as ts.TypeReference).typeArguments?.[0];
    if (tuple && checker.isTupleType(tuple)) {
      const parts = (tuple as ts.TypeReference).typeArguments ?? [];
      return new UnionType(parts.map((t) => convertSchema(checker, typeAlias, t, aliases)));
    }
  }

  // ObjectSchema<T>
  if (isTypeReference(type, "ObjectSchema")) {
    const shape = (type as ts.TypeReference).typeArguments?.[0];
    if (shape) return convertShape(checker, typeAlias, shape, aliases);
  }

  // exported schema reference -> alias
  const symbol = type.getSymbol();
  const alias = symbol && aliases.get(symbol);
  if (alias) {
    return ReferenceType.createResolvedReference(alias.name, alias, typeAlias.project);
  }

  return new IntrinsicType("unknown");
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

function convertShape(
  checker: ts.TypeChecker,
  typeAlias: DeclarationReflection,
  shape: ts.Type,
  aliases: Map<ts.Symbol, DeclarationReflection>,
): ReflectionType {
  const decl = new DeclarationReflection("__type", ReflectionKind.TypeLiteral, typeAlias);

  decl.children = [];

  for (const prop of shape.getProperties()) {
    const member = new DeclarationReflection(prop.name, ReflectionKind.Property, decl);

    const propType = checker.getTypeOfSymbol(prop);

    if (isTypeReference(propType, "OptionalSchema")) {
      member.flags.setFlag(ReflectionFlag.Optional, true);

      const valueType = (propType as ts.TypeReference).typeArguments?.[0];
      member.type = valueType
        ? convertSchema(checker, typeAlias, valueType, aliases)
        : new IntrinsicType("unknown");
    } else {
      member.type = convertSchema(checker, typeAlias, propType, aliases);
    }

    decl.children.push(member);
  }

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
