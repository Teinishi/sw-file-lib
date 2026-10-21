# Reading and Writing XML

[`@sw-file-lib/xml`](/api/@sw-file-lib/xml/) provides type-safe parsers and serializers for Stormworks vehicle, standalone microcontroller, and component definition XML files. Parsed XML is converted into plain TypeScript objects, making it easy to inspect and modify the data.

## Parse a vehicle XML

Read the XML file as text and parse it into a typed object.

```ts
import { parseVehicleXml } from "@sw-file-lib/xml";

const text = await file.text();
const vehicle = parseVehicleXml(text);
```

The returned `vehicle` object is fully typed with the type [`Vehicle`](/api/@sw-file-lib/xml/namespaces/VehicleSchemas/interfaces/Vehicle.html), with autocompletion and type checking available throughout the entire structure.

## Modify vehicle data

For example, move every component 1 block along the X axis by editing its local position.

```ts
for (const body of vehicle.bodies ?? []) {
  for (const component of body.components ?? []) {
    const x = component.o?.vp?.x ?? 0;
    component.o ??= {};
    component.o.vp ??= {};
    component.o.vp.x = x + 1;
  }
}
```

Because the parsed object uses ordinary TypeScript types, it can be manipulated with normal language features such as loops, array methods, and object destructuring.

## Serialize back to XML

Convert the modified object back into an XML string.

```ts
import { serializeVehicleXml } from "@sw-file-lib/xml";

const output = serializeVehicleXml(vehicle);
// string
```

The resulting string can be written directly to an XML file.

## Read and write a standalone microcontroller

Use `parseMicrocontrollerXml()` and `serializeMicrocontrollerXml()` for standalone microcontroller files, whose root element is `<microprocessor>`.

```ts
import { parseMicrocontrollerXml, serializeMicrocontrollerXml } from "@sw-file-lib/xml";

const text = await file.text();
const microcontroller = parseMicrocontrollerXml(text);

microcontroller.name = "My controller";
microcontroller.description = "Updated with sw-file-lib";

const output = serializeMicrocontrollerXml(microcontroller, { indent: 2 });
```

The parsed value has type [`Microprocessor`](/api/@sw-file-lib/xml/namespaces/MicrocontrollerSchemas/interfaces/Microprocessor). Functions that only read the data can accept [`MicroprocessorImmutable`](/api/@sw-file-lib/xml/namespaces/MicrocontrollerSchemas/interfaces/MicroprocessorImmutable). The public functions use **microcontroller**, while the XML tag, schema (`MicroprocessorSchema`), and data types retain **microprocessor** to match the file format.

### Standalone files and definitions embedded in vehicles

A vehicle component can contain `component.o.microprocessor_definition`. This is part of the vehicle schema, with its own `VehicleSchemas.MicroprocessorDefinition` type and `VehicleSchemas.MicroprocessorDefinitionSchema`. Parse the vehicle with `parseVehicleXml()` and serialize it with `serializeVehicleXml()` to read or modify that embedded definition.

Standalone microcontroller files use a separate schema, `MicroprocessorSchema`. Their structure differs from embedded definitions: for example, standalone files support `hide_in_inventory` and the `group.component_states` / `group.component_bridge_states` records. The schemas are not interchangeable; changing the root tag alone does not convert between the two formats.

## Safe parsing and serialization

The standard functions throw an error if the input is invalid. If you want to handle failures without exceptions, use the safe variants.

```ts
import { safeParseVehicleXml } from "@sw-file-lib/xml";

const result = safeParseVehicleXml(text);

if (!result.success) {
  console.error(result.error);
} else {
  console.log(result.data.name);
}
```

Serialization also provides a safe version with the same result pattern.

```ts
import { safeSerializeVehicleXml } from "@sw-file-lib/xml";

const result = safeSerializeVehicleXml(vehicle);

if (result.success) {
  console.log(result.data);
}
```

Use the throwing API for simple applications, and the safe API when validation errors should be reported to users.

Standalone microcontrollers provide the same result pattern through [`safeParseMicrocontrollerXml()`](/api/@sw-file-lib/xml/functions/safeParseMicrocontrollerXml) and [`safeSerializeMicrocontrollerXml()`](/api/@sw-file-lib/xml/functions/safeSerializeMicrocontrollerXml).

## Supported formats

[`@sw-file-lib/xml`](/api/@sw-file-lib/xml/) includes parsers and serializers for several Stormworks XML formats.

| Format                       | Parse                                                                                        | Serialize                                                                                            | Type                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Component definition         | [`parseComponentDefinitionXml`](/api/@sw-file-lib/xml/functions/parseComponentDefinitionXml) | [`serializeComponentDefinitionXml`](/api/@sw-file-lib/xml/functions/serializeComponentDefinitionXml) | [`ComponentDefinition`](/api/@sw-file-lib/xml/namespaces/ComponentDefinitionSchemas/interfaces/ComponentDefinition) |
| Microcontroller (standalone) | [`parseMicrocontrollerXml`](/api/@sw-file-lib/xml/functions/parseMicrocontrollerXml)         | [`serializeMicrocontrollerXml`](/api/@sw-file-lib/xml/functions/serializeMicrocontrollerXml)         | [`Microprocessor`](/api/@sw-file-lib/xml/namespaces/MicrocontrollerSchemas/interfaces/Microprocessor)               |
| Vehicle                      | [`parseVehicleXml`](/api/@sw-file-lib/xml/functions/parseVehicleXml)                         | [`serializeVehicleXml`](/api/@sw-file-lib/xml/functions/serializeVehicleXml)                         | [`Vehicle`](/api/@sw-file-lib/xml/namespaces/VehicleSchemas/interfaces/Vehicle)                                     |

The corresponding built-in schemas are `ComponentDefinitionSchema`, `MicroprocessorSchema`, and `VehicleSchema`. For nested schemas and types, use the `ComponentDefinitionSchemas`, `MicrocontrollerSchemas`, and `VehicleSchemas` namespace exports. To customize a built-in schema, see [Extending existing schemas](/guide/advanced/xml-schema#extending-existing-schemas).
