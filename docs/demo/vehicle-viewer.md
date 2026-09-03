# Interactive Vehicle Viewer

<script setup>
import sampleVehicle from "./data/sample_vehicle.xml?raw";
</script>

<VehicleViewerDemo :default-vehicle="sampleVehicle" :show-options="true" />

## How it works

1. Parse `sample_vehicle.xml`
2. Resolve component definitions and mesh files
3. Assemble each body
4. Render with Three.js

```ts
const vehicle = parseVehicleXml(text);
const assembler = new VehicleBodyAssembler(resolver);

for (const component of body.components ?? []) {
  await assembler.appendComponent(component);
}

const object = assembler.build();
```

::: info

For simplicity, this demo only resolves basic blocks, wedges, pyramids, and inverse pyramids. No meshes are resolved.

:::

::: details Sample vehicle XML

<<< ./data/sample_vehicle.xml

:::
