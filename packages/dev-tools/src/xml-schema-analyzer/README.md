# XML schema analyzer

Analyze XML files and generate TypeScript interfaces using a config file:

```ts
import { defineConfig } from "@sw-file-lib/dev-tools/xml-schema-analyzer";

export default defineConfig({
  input: "./vehicles/*.xml",
  out: "./vehicle.ts",
  interfaceNames: {
    vehicle: "Vehicle",
    "vehicle/bodies/body": "VehicleBody",
  },
});
```

Run `xml-schema-analyzer --config ./analyzer.config.ts`.

`interfaceNames` keys are exact, case-sensitive XML paths from the root element,
separated by `/`, without a leading slash. Unspecified interfaces retain automatic
names. Names are used as written and must be valid TypeScript interface identifiers.

Structurally compatible XML elements are merged before naming. A name specified for
any merged path applies to the shared interface and all references to it. Multiple
merged paths may specify the same name; different names for the same interface are
an error. Naming does not change merging behavior.

Duplicate explicit names, names conflicting with external imports, and paths with
no generated interface are errors. The latter includes nonexistent paths, list
containers, empty elements, and elements replaced by `predefinedSchemas`. To name
a list item, specify its element path, such as `vehicle/bodies/body`.

Explicit names and external import names take priority over automatic names.
Automatic name collisions (including collisions after PascalCase conversion) use
numeric suffixes starting at `2`. Invalid automatic names use an `Xml` prefix.

The programmatic API accepts the same options:

```ts
const code = generateCode(schemaEntries, {
  interfaceNames: { vehicle: "Vehicle" },
});
```

Naming happens after XML analysis, so changes to `interfaceNames` also apply when
the CLI reuses its analysis cache; `--refresh` is unnecessary for naming changes.

## Interface markers and TSDoc

Every emitted object interface has a `// @xml-schema` marker. Metalist interfaces
have `// @xml-schema metalist "itemTag"` instead. To insert TSDoc between the marker
and declaration, provide a synchronous `generateTSDoc` callback:

```ts
export default defineConfig({
  input: "./vehicles/*.xml",
  out: "./vehicle.ts",
  generateTSDoc({ identifier, xmlLocations }) {
    const xmlPaths = xmlLocations.map((location) => location.join("/"));
    return `${identifier} inferred from XML.\n\n@remarks\nXML paths: ${xmlPaths.join(", ")}`;
  },
});
```

The callback returns comment body text, without `/**` and `*/`. The generator wraps
it in a TSDoc block. Return `undefined`, an empty string, or whitespace to omit
TSDoc. Multiline text and TSDoc tags are supported; closing comment delimiters in
the body are rejected. Output has this order:

```ts
// @xml-schema
/**
 * Vehicle inferred from XML.
 *
 * @remarks
 * XML paths: vehicle
 */
export interface Vehicle {}
```

The exported `InterfaceTSDocContext` provides:

| Field                      | Information                                                                                                                                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `identifier`               | Final interface name, including config overrides and collision resolution.                                                                                                                                                                                               |
| `schemaIndex`, `schema`    | Entry index and final schema after overrides and merging. Includes kind, XML locations, property types, optionality, possible values, numeric ranges, and attribute/child order graphs. Metalist properties describe `meta`; `itemTag` and `itemRef` describe its items. |
| `xmlLocations`             | All merged XML locations as arrays of tag names.                                                                                                                                                                                                                         |
| `parents`                  | Emitted parent interfaces, including their final identifiers, schemas, and referencing property paths.                                                                                                                                                                   |
| `schemaEntries`            | All schemas, including inlined item schemas omitted from standalone output.                                                                                                                                                                                              |
| `getIdentifier(ref)`       | Resolves an internal or external reference to its TypeScript name.                                                                                                                                                                                                       |
| `getSchema(ref)`           | Resolves an internal reference to its schema. External references return `undefined`.                                                                                                                                                                                    |
| `documentData`             | Original analysis, including observed numeric categories and value statistics before schema overrides.                                                                                                                                                                   |
| `inputFiles`, `outputPath` | Resolved input file paths and effective output path from the CLI.                                                                                                                                                                                                        |
| `allPropertiesOptional`    | Whether output optionality is forced. Raw schema properties retain their own optionality; metalist wrappers remain required.                                                                                                                                             |

`parents` lists emitted interfaces that directly reference the current interface:

```ts
generateTSDoc({ parents }) {
  return parents
    .map(({ identifier, propertyPaths }) =>
      `Parent: {@link ${identifier}} (${propertyPaths.join(", ")})`,
    )
    .join("\n");
}
```

Each entry has `identifier`, `schema`, and `propertyPaths`. Multiple references from
one parent are grouped, with duplicate paths removed. Paths are relative to the
parent interface: `child`, `children[]`, `meta.child`, or `items[].child`. Keys
requiring quotes use bracket notation, such as `["a-b"]`. Parents use final names
from `interfaceNames` and collision resolution. Root/unreferenced interfaces have
an empty array. These are TypeScript reference relationships, rather than XML
ancestry. Inlined metalist items contribute their child references to the emitted
metalist parent; omitted item interfaces are never listed as parents. When a
metalist item is another metalist interface, its parent path is `items[]`.

Treat supplied data as read-only. The callback runs once per emitted interface;
it does not run for omitted inlined item declarations. Downstream schema codegen
recognizes markers even when TSDoc appears between the marker and interface.

For programmatic calls, use `generateCode(schemaEntries, { generateTSDoc }, source)`.
The optional third argument (`GenerateCodeSource`) supplies `documentData`,
`inputFiles`, and `outputPath`; these context fields are otherwise `undefined`.
The CLI supplies all three on fresh and cached runs. Changing the callback does
not require XML reanalysis.

## Making all generated properties optional

Set `allPropertiesOptional: true` in config to emit `?` on every property of every
generated interface, including attributes, child elements, and list properties,
except for the structural `meta` and `items` fields of metalist interfaces:

```ts
export default defineConfig({
  input: "./vehicles/*.xml",
  out: "./vehicle.ts",
  allPropertiesOptional: true,
});
```

This takes priority over inferred requiredness and `schemaOverrides` entries with
`optional: false`. The default is `false`, which preserves each property's inferred
or overridden optionality. This option only changes code generation; it preserves
schema data and analysis caches. Properties inside imported predefined types keep
their external definitions. The option is also accepted by `generateCode`.

## Supplementing and overriding inferred properties

Use `schemaOverrides` to add missing primitive properties or override their inferred
types and optionality:

```ts
export default defineConfig({
  input: "./vehicles/*.xml",
  out: "./vehicle.ts",
  schemaOverrides: {
    "vehicle/some_element": {
      properties: {
        x: { type: "string", optional: true },
        y: { type: "number", optional: true },
      },
    },
  },
});
```

Like `forceKind`, `schemaOverrides` also accepts a synchronous callback receiving
the XML location as a readonly array of tag names:

```ts
schemaOverrides(xmlLocation) {
  if (xmlLocation.at(-1) === "position") {
    return {
      properties: {
        y: { type: "number", optional: true },
      },
    };
  }
  return undefined;
},
```

The callback runs once per object or metalist location before schema merging.
Return `undefined` to leave that location unchanged. Empty elements selected as
objects can also be supplemented. Metalist overrides apply to metadata; callbacks
also run for its object items and metadata children. List container locations are
not passed to the callback, but their object item locations are.

Record entries for nonexistent/non-object paths still produce errors. Callbacks
have no enumerated keys, so there is no unused-path check for them. Both forms
apply to cached analysis without `--refresh` and are accepted by `generateSchema`.

For example, an inferred `{ x: number }` becomes `{ x?: string; y?: number }`.
Supported property types are `string`, `number`, and `boolean`; `optional` is
required and controls whether the property is optional, even if it was always
present or sometimes missing in the samples.

For existing primitive properties, the configured type and optionality take
priority over inference. When the type changes, observed possible values and
numeric ranges are cleared; when it stays the same, that metadata is preserved.
Unions containing only primitive types can also be overridden. Object, list,
empty-object properties, and unions containing them cannot be replaced with
primitive types and cause an error.

Paths follow the same exact matching rules as `interfaceNames` and must identify
existing object or metalist elements. Overrides on a metalist apply to its metadata
using the original XML property names. Missing paths and list container paths are
errors; target the item element to supplement a list. Empty elements can be
supplemented when selected as objects with `forceKind`.

Supplementation happens before predefined schema matching and schema merging.
Unrelated paths keep their inferred properties, subject to the existing merging
rules (including `mergeNumberSuffix` when enabled). Newly added properties appear
after observed attributes, in config order, and before child elements. Cached
analysis is preserved, so changing overrides does not require `--refresh`.

The same option is available through `generateSchema(documentData, options)`.

## Inferring attribute types

Each observed attribute value is classified as `boolean` (`"true"` or `"false"`),
`unsignedInt` (digits without a sign), `int` (integers with `+` or `-`), `float`
(decimal notation), or `string` (all other values). Each value has one category;
for example, `"123"` is `unsignedInt`, `"+123"` is `int`, and `"123.0"` is `float`.
The analysis retains all observed categories for future output languages.
TypeScript schema generation maps all three numeric categories to `number` and
removes duplicates. Mixed values produce a union of the observed types:

| Values                     | Inferred type                 |
| -------------------------- | ----------------------------- |
| `"true"`, `"false"`        | `boolean`                     |
| `"123"`, `"4.5"`           | `number`                      |
| `"true"`, `"123"`          | `boolean \| number`           |
| `"123"`, `"abc"`           | `number \| string`            |
| `"true"`, `"123"`, `"abc"` | `boolean \| number \| string` |

Union members always appear in `boolean`, `number`, `string` order regardless of
sample order. `"0"` and `"1"` are numbers. Observed types are retained even when the
possible-values limit is exceeded; numeric ranges describe only numeric samples.
`schemaOverrides` takes priority over inferred unions as well as individual types.

### Preferring string in unions

Set `preferStringInUnions: true` in config (or `generateCode` options) to omit
`number` and `boolean` from unions that contain `string`:

```ts
export default defineConfig({
  input: "./vehicles/*.xml",
  out: "./vehicle.ts",
  preferStringInUnions: true,
});
```

`number | string` and `boolean | number | string` become `string`.
`boolean | number` stays unchanged. Object references are preserved, so
`number | string | SomeObject` becomes `string | SomeObject`. The option applies
recursively, including metalist metadata, inlined items, and list item types.
Existing restrictions on unrepresentable list unions still apply.

The default is `false`. This is a code generation option: raw analysis, inferred
schema types, metadata, merging, and cache validity are unchanged. TSDoc callbacks
receive the original schema types and `context.preferStringInUnions` to distinguish
inferred types from output behavior. Changing the option does not require
`--refresh`.

## List and metalist markers

List properties have an XML schema marker immediately before the property:

```ts
// @xml-schema list "item"
items?: Item[];
```

Metalists have their own interface with a declaration-level marker. Attributes
and non-repeating child elements go into `meta`; repeated elements go into the
`items` array. For `<foo size="2"><bar text="a"/><bar text="b"/></foo>`:

```ts
// @xml-schema metalist "bar"
export interface Foo {
  meta: { size: number };
  items: { text: string }[];
}
```

Parent properties simply reference `Foo`, without an array suffix or a metalist
property marker. The structural `meta` and `items` fields are always required,
including with `allPropertiesOptional: true`; their inner properties honor that
option. `interfaceNames` can name the metalist using its XML path.

Object item interfaces used only by inlined metalist items are omitted from the
output. Definitions shared with other XML locations or referenced by other
properties/lists remain, as do interfaces referenced from the inlined item body.

Item tags come from the original XML child element and are part of schema type
equality. Different list tags are not equivalent, even when their TypeScript item
types match. Metalists are kept separate from plain objects and only merge with
metalists having the same item tag and item type. Forced incompatible metalist
merges report an error.

A union containing a list or directly nested lists cannot be described with one
property marker and cause an explicit code-generation error identifying the
interface and property. Metalists use interface references and can therefore
appear in unions or be list items. A metalist item may be an object (inlined), an
external predefined type, or another metalist interface. A list container as a
metalist item cannot currently be represented and reports an error.

This metadata is derived during schema generation, so existing XML analysis
caches can be reused. The downstream `xml-schema-codegen` reads declaration-level
metalist markers and supports referenced item types as well as inline objects.

## Cache reuse and config changes

The CLI caches XML analysis, then applies schema and code generation settings on
every run. The following config changes have these effects:

| Config                  | Reanalyze XML?        | Reason                                                                                         |
| ----------------------- | --------------------- | ---------------------------------------------------------------------------------------------- |
| `input`                 | Yes                   | Selects source XML files.                                                                      |
| `predefinedSchemas`     | No                    | Matches inferred schemas to external types.                                                    |
| `forceKind`             | No                    | Selects object/list/metalist during schema generation.                                         |
| `mergeNumberSuffix`     | No                    | Controls schema merging.                                                                       |
| `schemaOverrides`       | No                    | Adds/corrects properties during schema generation.                                             |
| `interfaceNames`        | No                    | Names generated TypeScript interfaces.                                                         |
| `allPropertiesOptional` | No                    | Makes all generated interface properties optional.                                             |
| `preferStringInUnions`  | No                    | Omits number/boolean from output unions containing string.                                     |
| `generateTSDoc`         | No                    | Generates documentation from the current schema and cached analysis.                           |
| `out`                   | No change to analysis | Changes output and cache locations. A new location without a matching cache requires analysis. |

The cache contains the resolved `input` configuration, the matched absolute file
paths, and each file's size and modification time. These must all match to reuse
analysis. Thus changes to the input pattern, file additions/removals, and source
updates automatically cause reanalysis. Explicit file arrays preserve their order;
glob results are sorted for stable processing. Relative paths resolve from the
working directory, as before.

File contents are not hashed; edits preserving both size and modification time
require `--refresh`. `--refresh` always forces analysis. Caches without input
metadata are treated as cache misses. No format versioning or migration is added;
after future analyzer algorithm changes, regenerate caches with `--refresh`.

`AnalyzeOptions` passed directly to the programmatic `analyzeFiles` API also affect
analysis (`forceKindRoot`, its own `forceKind`, and `maxPossibleValueCount`). These
are not CLI config fields: the CLI currently passes fixed analysis options `{}`.
In particular, config `forceKind` is a schema-generation option, distinct from
`AnalyzeOptions.forceKind`, and does not invalidate the CLI cache.
