# Reading and Writing XML

[`@sw-file-lib/xml`](/api/@sw-file-lib/xml) provides type-safe parsers and serializers for Stormworks XML files. Parsed XML is converted into plain TypeScript objects, making it easy to inspect and modify vehicle data.

## Parse a vehicle XML

Read the XML file as text and parse it into a typed object.

```ts
import { parseVehicleXml } from "@sw-file-lib/xml";

const text = await file.text();
const vehicle = parseVehicleXml(text);
```

The returned `vehicle` object is fully typed with the type [`Vehicle`](/api/@sw-file-lib/xml/interfaces/Vehicle.html), with autocompletion and type checking available throughout the entire structure.

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

## Supported formats

[`@sw-file-lib/xml`](/api/@sw-file-lib/xml) includes parsers and serializers for several Stormworks XML formats.

| Format               | Parse                                                                                        | Serialize                                                                                            | Type                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Component definition | [`parseComponentDefinitionXml`](/api/@sw-file-lib/xml/functions/parseComponentDefinitionXml) | [`serializeComponentDefinitionXml`](/api/@sw-file-lib/xml/functions/serializeComponentDefinitionXml) | [`ComponentDefinition`](/api/@sw-file-lib/xml/interfaces/ComponentDefinition) |
| Microcontroller      | [`parseMicrocontrollerXml`](/api/@sw-file-lib/xml/functions/parseMicrocontrollerXml)         | [`serializeMicrocontrollerXml`](/api/@sw-file-lib/xml/functions/serializeMicrocontrollerXml)         | [`Microcontroller`](/api/@sw-file-lib/xml/interfaces/Microcontroller)         |
| Vehicle              | [`parseVehicleXml`](/api/@sw-file-lib/xml/functions/parseVehicleXml)                         | [`serializeVehicleXml`](/api/@sw-file-lib/xml/functions/serializeVehicleXml)                         | [`Vehicle`](/api/@sw-file-lib/xml/interfaces/Vehicle)                         |
