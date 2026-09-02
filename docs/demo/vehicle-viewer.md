# Interactive Vehicle Viewer

<script setup>
import sampleVehicle from "./data/sample_vehicle.xml?raw";
</script>

<VehicleViewerDemo :default-vehicle="sampleVehicle" />

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

For simplicity, this demo only resolves basic block (`01_block.xml`) and wedge (`02_wedge.xml`), and no meshes.

:::

::: details Sample vehicle XML

<<< ./data/sample_vehicle.xml

:::
