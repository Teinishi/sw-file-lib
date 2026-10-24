# Advanced: XML Schema Guide

Stormworks XML is highly structured, making it much closer to JSON than general-purpose XML. The [`@sw-file-lib/xml/xml-schema`](/api/@sw-file-lib/xml/xml-schema/) package provides a schema-based API that lets you parse XML into fully typed TypeScript objects and serialize those objects back into XML.

:::tip
For handling vehicle, microcontroller, or component definition XML data, [`@sw-file-lib/xml`](/api/@sw-file-lib/xml/) provides built-in schemas, parse functions, and serialize functions. See [Reading and Writing XML](/guide/read-write-xml) for the supported formats and the distinction between standalone microcontrollers and definitions embedded in vehicles.
:::

## How Stormworks XML maps to objects

Most Stormworks XML consists of three basic kinds of elements:

- **Objects**: elements with unique attributes and child elements
- **Lists**: elements that contain multiple children of the same tag
- **Records**: elements whose children have arbitrary unique tags and share a common schema

Unlike ordinary XML, Stormworks XML does **not** use text nodes. This enables the library to convert XML into a clean JavaScript object without requiring special handling for mixed content.

The library also infers TypeScript types directly from your schema, so the parsed object is fully type-safe.

## Quick example

```ts
import * as x from "@sw-file-lib/xml/xml-schema";

const ExampleSchema = x.object({
  some_attribute: x.number(),

  some_child: x.object({
    attribute_of_child: x.string(),
  }),

  some_list: x
    .list(
      "item_tag",
      x.object({
        item_name: x.string(),
      }),
    )
    .optional(),
});

type Example = x.Infer<typeof ExampleSchema>;
type ExampleImmutable = x.InferImmutable<typeof ExampleSchema>;

const inputXml = `<root some_attribute="123">
  <some_child attribute_of_child="hello"/>
  <some_list>
    <item_tag item_name="alpha"/>
    <item_tag item_name="beta"/>
    <item_tag item_name="gamma"/>
  </some_list>
</root>`;

const data = ExampleSchema.parse(inputXml, "root");

console.log(data);
/*
{
  some_attribute: 123,
  some_child: {
    attribute_of_child: "hello"
  },
  some_list: [
    { item_name: "alpha" },
    { item_name: "beta" },
    { item_name: "gamma" }
  ]
}
*/

const xml = ExampleSchema.serialize(data, "root", {
  indent: 2,
});

console.log(xml === inputXml); // true
```

## Attributes vs child elements

The schema does not require you to explicitly distinguish between XML attributes and child elements.

| Schema type                            | XML representation |
| -------------------------------------- | ------------------ |
| `string`, `number`, `boolean`          | Attribute          |
| `object`, `list`, `metalist`, `record` | Child element      |

For example:

```ts
x.object({
  id: x.number(), // attribute
  name: x.string(), // attribute

  position: x.object({
    x: x.number(),
    y: x.number(),
    z: x.number(),
  }), // child element
});
```

becomes:

```xml
<part id="1" name="Example">
  <position x="0" y="1" z="2"/>
</part>
```

## Optional fields

Individual fields can be made optional with `.optional()`.

```ts
const Schema = x.object({
  required: x.string(),
  optional: x.number().optional(),
});
```

If every field should be optional, use either:

```ts
x.object({...}).partial()
```

or

```ts
x.partialObject({...})
```

Both produce an object where every property is optional.

## Extending existing schemas

Instead of rewriting a schema, you can create a new one by extending an existing `object` schema. This is particularly useful when `@sw-file-lib/xml` already provides a built-in schema, but you need to support additional fields or introduced in a future Stormworks update.

### Add fields

```ts
const ExistingSchema = x.object({
  a: x.number(),
});

const ExtendedSchema = ExistingSchema.extend({
  b: x.number(),
});

const data = ExtendedSchema.parse('<root a="1" b="2"/>', "root");

// { a: 1, b: 2 }
```

The original schema is unchanged; `extend()` always returns a new schema.

### Extend nested objects

For deeply nested structures, pass a callback to `extend()` so you can reference the existing child schemas.

```ts
const DeepSchema = x.object({
  level1: x.object({
    level2: x.object({
      a: x.number(),
    }),
  }),
});

const ExtendedDeepSchema = DeepSchema.extend((s) => ({
  level1: s.level1.extend((s) => ({
    level2: s.level2.extend({
      b: x.number(),
    }),
  })),
}));
```

This pattern keeps nested extensions concise without duplicating the entire schema.

### Extending lists, metalists, and records

If a `list`, `metalist`, or `record` contains **object items**, you can extend the item schema with `extendItem()`.

```ts
const ItemList = x.list(
  "item",
  x.object({
    name: x.string(),
  }),
);

const ExtendedList = ItemList.extendItem({
  value: x.number(),
});
```

:::tip
`extendItem()` is only available when the item itself is an `object`. Collections whose items are immediately another `list`, `metalist`, or `record` cannot be extended.
:::

For `metalist`, the metadata object can also be extended independently using `extendMeta()`.

```ts
const ExtendedMeta = MetalistSchema.extendMeta({
  version: x.number(),
});
```

## Omitting fields

`omit()` creates a new schema by removing fields from an existing `object` schema.

```ts
const RgbaSchema = x.object({
  r: x.number(),
  g: x.number(),
  b: x.number(),
  a: x.number(),
});

const RgbSchema = RgbaSchema.omit(["a"]);
```

Use `.omitItem()` to omit object item fields from lists, metalists, and records. Metalists also provide `.omitMeta()` to omit metadata fields.

## Union types

Use `x.union()` to accept one of multiple schema types.

```ts
const Value = x.union([x.number(), x.string()]);
```

::: tip
**Order matters.** Union members are tried from left to right. A broad type placed first may prevent later schemas from matching as intended.
:::

When a union mixes primitive and object types, primitives are read from attributes while objects are read from child elements. This matches the few Stormworks XML cases where the same logical field may appear either as an attribute or as a child element.

## Inferred TypeScript types

Every schema can produce corresponding TypeScript types.

```ts
type Mutable = x.Infer<typeof Schema>;
type Immutable = x.InferImmutable<typeof Schema>;
```

`InferImmutable` recursively applies `readonly`, making it ideal for function parameters and data that should not be mutated.

## Parsing XML

Schemas created with `x.object()`, `x.partialObject()`, `x.list()`, `x.metalist()`, and `x.record()` provide a `.parse()` method.

```ts
const data = Schema.parse(xmlString, "root");
```

The input may be:

- `string`
- `Uint8Array`
- [`SwXmlNodeList`](/api/@sw-file-lib/xml/classes/SwXmlNodeList.html)

::: info
[`SwXmlNodeList`](/api/@sw-file-lib/xml/classes/SwXmlNodeList.html) is an internal intermediate representation. Most applications never need it, but it can improve performance when parsing multiple root elements by calling [`parseSwXml()`](/api/@sw-file-lib/xml/functions/parseSwXml.html) only once.
:::

### Parse options

```ts
Schema.parse(xml, "root", {
  unknownField: "error",
  allowNaN: false,
  duplicateChildElement: "error",
});
```

#### `unknownField`

Controls how unknown attributes or child elements are handled.

| Value      | Behavior                                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| `"error"`  | Throw an error (default)                                                                                             |
| `"ignore"` | Skip unknown fields                                                                                                  |
| Callback   | Decide case by case (see [UnknownFieldCallback](/api/@sw-file-lib/xml/xml-schema/type-aliases/UnknownFieldCallback)) |

#### `allowNaN`

Determines whether invalid numeric values become `NaN` instead of throwing an error.

Default: `false`

#### `duplicateChildElement`

Rarely, Stormworks XML contains duplicate child elements where only one is expected.

| Value     | Behavior                                                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `"error"` | Throw an error (default)                                                                                                                |
| `"first"` | Select the first candidate                                                                                                              |
| `"last"`  | Select the last candidate                                                                                                               |
| Callback  | Decide case by casse (see [DuplicateChildElementCallback](/api/@sw-file-lib/xml/xml-schema/type-aliases/DuplicateChildElementCallback)) |

## Safe parsing

If you prefer not to throw exceptions, use `.safeParse()`.

```ts
const result = Schema.safeParse(xml, "root");

if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

This returns a `Result` object instead of throwing.

## Serializing XML

Convert an object back into XML with `.serialize()`.

```ts
const xml = Schema.serialize(data, "root", {
  indent: 2,
  xmlDeclaration: true,
});
```

### Serialize options

| Option           | Description                                      |
| ---------------- | ------------------------------------------------ |
| `indent`         | String or number of spaces for indentation       |
| `xmlDeclaration` | Include `<?xml version="1.0" encoding="UTF-8"?>` |

If `indent` is omitted, the output is generated without extra whitespace.

A corresponding `.safeSerialize()` method is also available.

## Metalist

A small number of Stormworks XML elements break the usual pattern by having **both attributes and a repeated child element**. For these cases, use `x.metalist()`.

```ts
const Schema = x.metalist(
  "itemTag",

  x.object({
    meta_attribute: x.number(),
  }),

  x.object({
    item_attribute: x.string(),
  }),
);
```

This parses into:

```ts
{
  meta: {
    meta_attribute: number;
  }

  items: {
    item_attribute: string;
  }
  [];
}
```

You can think of `metalist` as a combination of `object` and `list`: the parent element stores metadata, while its children become an array of items.

## Record

Use `x.record(itemSchema)` when child elements have arbitrary tag names but share a common schema. The parent has no attributes. Each child tag becomes an object key, and its parsed contents become the corresponding value.

```ts
const Values = x.record(x.object({ value: x.number() }));

type Values = x.Infer<typeof Values>;
// Record<string, { value: number }>

const data = Values.parse('<root><alpha value="1"/><beta value="2"/></root>', "root");
// { alpha: { value: 1 }, beta: { value: 2 } }

const xml = Values.serialize(data, "root", {
  xmlDeclaration: false,
}).toString();
// <root><alpha value="1"/><beta value="2"/></root>
```

The item schema must be an element schema (`object`, `list`, `metalist`, or `record`), rather than a primitive, optional, or union schema. Records can also be nested inside these element schemas, and a record field can be made optional with `.optional()`.

```ts
const Schema = x.object({
  values: Values.optional(),
});

const ExtendedValues = Values.extendItem({
  enabled: x.boolean().optional(),
});

const OnlyValue = ExtendedValues.omitItem(["enabled"]);
```

An empty element such as `<root/>` produces `{}`. An absent required record field still produces a missing-field error. `InferImmutable` makes both the dictionary and its values deeply readonly. As with other string-keyed dictionaries, an arbitrary key is not guaranteed to exist at runtime.

Duplicate child tags follow `duplicateChildElement`: the default is an error, while `"first"`, `"last"`, or a callback can select one occurrence. Only the selected occurrence is parsed. Error paths use the child tag as the record key, for example `["values", "alpha", "value"]`.

Parent attributes follow `unknownField`. All child tags are treated as record entries; the item schema validates their contents. `unknownField: "ignore"` does not suppress invalid item values.

Serialization uses own enumerable string keys as child tags and validates that they are XML element names. Arrays and `null` are rejected as record values. When parsing an existing `SwXmlNodeList`, keys such as `__proto__` are stored as ordinary own properties. String and byte inputs still follow the underlying XML parser's reserved-name restrictions; for example, it rejects `__proto__`. Output follows `Object.entries()` order; preserving the original XML child order is not guaranteed.
