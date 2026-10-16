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
existing object elements. Missing paths and list/metalist container paths are
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

## Cache reuse and config changes

The CLI caches XML analysis, then applies schema and code generation settings on
every run. The following config changes have these effects:

| Config              | Reanalyze XML?        | Reason                                                                                         |
| ------------------- | --------------------- | ---------------------------------------------------------------------------------------------- |
| `input`             | Yes                   | Selects source XML files.                                                                      |
| `predefinedSchemas` | No                    | Matches inferred schemas to external types.                                                    |
| `forceKind`         | No                    | Selects object/list/metalist during schema generation.                                         |
| `mergeNumberSuffix` | No                    | Controls schema merging.                                                                       |
| `schemaOverrides`   | No                    | Adds/corrects properties during schema generation.                                             |
| `interfaceNames`    | No                    | Names generated TypeScript interfaces.                                                         |
| `out`               | No change to analysis | Changes output and cache locations. A new location without a matching cache requires analysis. |

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
