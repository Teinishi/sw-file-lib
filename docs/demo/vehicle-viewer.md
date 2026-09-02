# Interactive Vehicle Viewer

<VehicleViewerDemo />

## How it works

1. Parse `vehicle.xml`
2. Resolve component definitions and mesh files
3. Assemble each body
4. Render with Three.js

```ts
const vehicle = parseVehicleXml(text);
const assembler = new VehicleBodyAssembler(resolver);

await assembler.appendComponent(component);
const object = assembler.build();
```
