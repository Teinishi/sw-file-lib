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
