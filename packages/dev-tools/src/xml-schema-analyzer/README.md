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

## Merging partially observed schemas

Use `mergeSchemas` to group XML elements whose differing sample properties should
belong to one schema. Group selectors can be exact XML paths, regular expressions,
or arrays mixing both:

```ts
export default defineConfig({
  input: "./vehicles/*.xml",
  out: "./vehicle.ts",
  mergeSchemas: {
    positions: ["vehicle/position", "vehicle/previous_position"],
    components: /^vehicle\/components\/component\d+$/,
  },
});
```

Alternatively, use a synchronous callback that returns a group key, or `undefined`
for ordinary automatic schema matching:

```ts
mergeSchemas(xmlLocation) {
  const tag = xmlLocation.at(-1);
  return tag === "position" || tag === "previous_position"
    ? "positions"
    : undefined;
},
```

Group keys are matching identifiers, not output interface names. Use
`interfaceNames` to name the shared interface. All XML locations are retained and
internal references point to the merged schema. Callbacks run once per
object/list/metalist location, before merging.

Grouping `{ x: number }` and `{ y: number }` produces `{ x?: number; y?: number }`.
Properties missing from either schema become optional. Common properties retain
their types and optionality; conflicting types form a union. Ordering, possible
values, and numeric ranges are merged. Nested child schemas are not recursively
forced to merge: group their paths separately if needed. Empty elements can
participate when selected as objects with `forceKind`.

Explicit groups stay separate from other groups and ungrouped schemas, even when
their structures match. Object groups are compared with `predefinedSchemas` after
all members have merged; a matching group uses the predefined type instead of
generating a local interface. This also applies to implicitly merged record items
and schemas corrected by `schemaOverrides`. Metalist containers retain their own
interfaces. References inside lists, metalists, records and unions are updated,
and unused matching local definitions are removed. List groups share item information without creating
a container interface. `schemaOverrides` applies before merging. `mergeNumberSuffix`
continues to apply to ungrouped schemas without crossing group boundaries.

A path matching multiple groups is an error. Exact selectors must identify
existing object, list, or metalist schemas; unmatched paths are errors.
Select the item element to merge differing item schemas themselves. Regexes and callbacks may
match no elements. Regex `lastIndex` does not affect matching and is not modified,
including for global/sticky expressions.

Objects and metalists cannot merge with each other. Metalists must have the same
item tag and item schema; group their item paths too when those schemas differ
because of sample coverage. Incompatible metalists report an error.
Unrepresentable list unions still fail during code generation.

Grouping runs on cached analysis, so changing `mergeSchemas` needs no `--refresh`.
The same option is accepted by `generateSchema`.

### Explicit element kinds

`forceKind` accepts `"object"`, `"record"`, `["list", itemTag]`, or `["metalist", itemTag]`.
The list/metalist tuples require a nonempty item tag, including for empty elements:

```ts
forceKind: {
  "root/object": "object",
  "root/list": ["list", "item"],
  "root/metalist": ["metalist", "entry"],
},
```

Callbacks return the same `ForceKindOption` values (readonly tuples are accepted):

```ts
forceKind(xmlLocation) {
  return xmlLocation.at(-1) === "entries"
    ? ["metalist", "entry"]
    : undefined;
},
```

`undefined` preserves automatic inference. Legacy bare `"list"`/`"metalist"` values
are no longer accepted. A list rejects child tags other than its configured item
tag. A metalist uses that tag for `items` and keeps attributes and other child
elements in `meta`; non-item child tags must not repeat. Thus a single item is
unambiguous without consulting other elements or a merge group.

### Empty lists and metalists

An empty element selected as a list with `forceKind` is kept unresolved until
merging completes. Its configured tag is retained. A populated list with the same
tag in the same `mergeSchemas` group supplies the item type:

```ts
forceKind: { "root/empty": ["list", "item"] },
mergeSchemas: { lists: ["root/empty", "root/populated"] },
```

For `<root><empty/><populated><item x="3"/><item x="4"/></populated></root>`,
both properties become `Item[]` with `// @xml-schema list "item"` markers.
The empty list remains a present property; emptiness alone does not make it optional.

This also works when merged parent objects contain the same list property: an
empty `root/a/items` can learn from `root/b/items` when `root/a` and `root/b` are
grouped. Input order does not matter. Analysis caches are preserved.

If no item type can be determined after merging, schema generation warns with
the unresolved XML paths and configured item tag, then creates an empty item
interface and continues. Its XML locations are the container paths followed by
the item tag, so `interfaceNames` and `generateTSDoc` can also describe it.
Lists in unrelated groups do not supply evidence.
Multiple child tags remain invalid. Directly grouped lists with known item types
must agree on the item tag and type; group their item paths separately if needed.
List groups cannot be mixed with object/metalist groups.

Metalists selected with `forceKind: ["metalist", itemTag]` likewise defer missing item
information until merging. Attributes and non-item child elements stay in `meta`.
A populated metalist with the same tag in the same group supplies the item schema:

```ts
forceKind: { "root/empty": ["metalist", "item"] },
mergeSchemas: { collections: ["root/empty", "root/populated"] },
```

This supports an empty element such as `<empty size="0"/>` and a populated member
such as `<populated size="2"><item x="3"/><item x="4"/></populated>`, regardless
of their order. The shared interface keeps required `meta` and `items` wrappers.
Metadata schemas are merged as usual; fields absent from a member become optional.

The configured tag distinguishes even a single item from metadata children;
no tag guessing from other group members is performed. If the item type is still
unknown after merging, a warning lists the unresolved metalist paths and item tag.
An empty item schema is used, inlined into `items: {}[]` as with other metalist
items; the required `meta` and `items` wrappers and metadata are preserved.
Evidence from unrelated groups is not used.
Conflicting tags/types or multiple repeating child types remain errors.

### Records

Records are selected only by `forceKind`; automatic object/list/metalist detection
is unchanged. Both record and callback config forms support `"record"`:

```ts
forceKind: { "root/values": "record" },
```

For `<root id="root"><values><alpha x="1"/><beta y="2"/></values></root>`,
the `values` property becomes `Record<string, Alpha>`, with a common item interface
containing optional `x` and `y` properties. All observed child tags contribute to
one item schema, including matching nested objects and metalist items. The item
interface retains all its actual XML locations, so attribute rules, overrides,
interface names and TSDoc generation remain available. Parent links in TSDoc use
paths such as `values[key]`. `Record` is reserved as a type name when the generated
code uses the TypeScript utility type.

Record containers require no attributes and unique child tags within each XML
element. Repeating a tag in different samples is allowed. Item schemas must merge
into a single element schema; incompatible kinds are errors. Values that are
themselves lists and records at the XML root are currently unsupported and produce
explicit errors. Nested records, metalist values, and records used as list or
metalist items are supported. Existing ambiguous object/list item detection still
requires `forceKind` at the item's XML location.

`mergeSchemas` can group record containers to share an item schema. If the item
type remains unknown after merging, a warning is emitted and the output uses
`Record<string, {}>` without creating an empty interface. Record fields retain
normal optionality rules; an empty present container does not make the field
optional. No record marker or item tag is required. If an explicit merge group
is assigned to record item paths, the selected item paths must agree on that group.
Changes to `forceKind` still reuse the raw analysis cache.

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

### Attribute type rules

Use `attributeTypes` to assign a primitive type to existing attributes by name,
regardless of their observed values:

```ts
export default defineConfig({
  input: "./vehicles/*.xml",
  out: "./vehicle.ts",
  attributeTypes: {
    text: "string",
  },
});
```

For example, `<label text="123"/>` produces `text: string` rather than
`text: number`. Supported types are `string`, `number`, and `boolean`. Rules apply
only to actual attributes, not child elements, and never add missing attributes.

For path-specific rules, use a synchronous callback:

```ts
attributeTypes(attributeName, xmlLocation) {
  if (attributeName === "text" && xmlLocation.at(-1) === "label") {
    return "string";
  }
  return undefined;
},
```

The callback receives the attribute name and the readonly tag-name array of its
containing element. Returning `undefined` preserves inference. It runs once per
attribute per analyzed XML location, including metalist metadata and object items.
Optionality is preserved. Value candidates and numeric ranges are cleared when
the inferred type changes; original analysis remains available in the cache and
TSDoc context.

Rules apply during schema generation, before `schemaOverrides`, predefined schema
matching, and merging. More specific `schemaOverrides` take priority. Changing
`attributeTypes` does not require `--refresh`; the option is also supported by
`generateSchema`.

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
| `forceKind`             | No                    | Selects object/list/metalist/record during schema generation.                                  |
| `mergeNumberSuffix`     | No                    | Controls schema merging.                                                                       |
| `mergeSchemas`          | No                    | Groups partially observed object/metalist schemas.                                             |
| `schemaOverrides`       | No                    | Adds/corrects properties during schema generation.                                             |
| `attributeTypes`        | No                    | Overrides attribute types by name or a path-aware callback.                                    |
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
