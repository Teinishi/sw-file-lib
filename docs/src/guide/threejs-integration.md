# Three.js Integration

[`@sw-file-lib/three`](/api/@sw-file-lib/three/) provides helpers for rendering Stormworks meshes and vehicles in [Three.js](https://threejs.org). Whether you're previewing a single mesh file or displaying a complete vehicle, the library converts Stormworks data into ready-to-use `THREE.Object3D` instances.

## Display a mesh file

The simplest workflow is loading a single `.mesh` file and creating a Three.js mesh.

```ts
import { parseMesh } from "@sw-file-lib/core";
import { createSwMesh } from "@sw-file-lib/three";

const meshData = parseMesh(bytes);
const meshObject = createSwMesh(meshData);

// Add to your Three.js scene
scene.add(meshObject);
```

[`createSwMesh()`](/api/@sw-file-lib/three/functions/createSwMesh) automatically creates the required `THREE.BufferGeometry` and Stormworks-style materials, so no manual geometry conversion is needed.

## Display a complete vehicle

Vehicles have reference to component definitions, and component definitions have reference to mesh files rather than containing geometry directly. [`VehicleBodyAssembler`](/api/@sw-file-lib/three/classes/VehicleBodyAssembler) resolves these assets and builds a renderable `THREE.Object3D`.

### Create an asset resolver

[`createVehicleAssetResolver()`](/api/@sw-file-lib/three/functions/createVehicleAssetResolver) wraps your loading functions and automatically converts and caches downloaded XML definitions and mesh files, so each asset is fetched only once even if multiple components reference it.

```ts
import { createVehicleAssetResolver } from "@sw-file-lib/three";

const assetResolver = createVehicleAssetResolver(
  (componentId) =>
    fetch(`/rom/data/definitions/${componentId}.xml`).then((res) =>
      res.ok ? res.text() : undefined,
    ),
  (meshPath) => fetch("/rom/" + meshPath).then((res) => (res.ok ? res.arrayBuffer() : undefined)),
);
```

### Assemble the vehicle

Parse the vehicle XML, append each component, and build a Three.js object for every body.

```ts
import * as THREE from "three";
import { parseVehicleXml } from "@sw-file-lib/xml";
import { VehicleBodyAssembler } from "@sw-file-lib/three";

const vehicle = parseVehicleXml(text);
const group = new THREE.Group();

for (const body of vehicle.bodies ?? []) {
  const assembler = new VehicleBodyAssembler(assetResolver);

  for (const component of body.components ?? []) {
    await assembler.appendComponent(component);
  }

  const obj = assembler.build();
  group.add(obj);
}

// Add the completed vehicle to the scene
scene.add(group);
```

The resulting `group` preserves the vehicle's body hierarchy and is ready to use with standard Three.js features such as lighting, cameras, and controls.

## Stormworks-style lighting

[`createSwLightGroup()`](/api/@sw-file-lib/three/functions/createSwLightGroup.html) creates a `THREE.Group` of lights tuned to resemble the appearance of Stormworks. While it is **not a complete recreation** of the game's renderer, it provides a similar neutral daylight environment and is recommended as the default lighting setup.

```ts
import { createSwLightGroup } from "@sw-file-lib/three";

const lightGroup = createSwLightGroup();
scene.add(lightGroup);
```

The returned lights are ordinary Three.js light objects, so they can be modified or combined with your own lighting as needed.

## Rendering GeometryBuilder directly

If your tool generates geometry procedurally, you can make a preview of it. [`bufferGeometryFromBuilder()`](/api/@sw-file-lib/three/functions/bufferGeometryFromBuilder) converts a [`GeometryBuilder`](/api/@sw-file-lib/geometry/classes/GeometryBuilder) directly into a `THREE.BufferGeometry`.

```ts
import { GeometryBuilder } from "@sw-file-lib/geometry";
import { bufferGeometryFromBuilder } from "@sw-file-lib/three";

const builder = new GeometryBuilder();

// Generate faces...

const geometry = bufferGeometryFromBuilder(builder);
```

## Stormworks materials

[`createSwMaterials()`](/api/@sw-file-lib/three/functions/createSwMaterials) returns the three material types used by Stormworks meshes: opaque, glass, and additive. These can be passed directly as a material array when constructing a `THREE.Mesh`.

```ts
import * as THREE from "three";
import { createSwMaterials } from "@sw-file-lib/three";

const materials = createSwMaterials();
const materialArr = [materials.opaque, materials.glass, materials.additive];

const mesh = new THREE.Mesh(geometry, materialArr);
scene.add(mesh);
```

## Choosing the right API

| Use case                                                                        | API                                                                                                                                                                             |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preview a single `.mesh` file                                                   | [`createSwMesh()`](/api/@sw-file-lib/three/functions/createSwMesh)                                                                                                              |
| Display an entire vehicle                                                       | [`VehicleBodyAssembler`](/api/@sw-file-lib/three/classes/VehicleBodyAssembler) + [`createVehicleAssetResolver()`](/api/@sw-file-lib/three/functions/createVehicleAssetResolver) |
| Stormworks-style lighting                                                       | [`createSwLightGroup()`](/api/@sw-file-lib/three/functions/createSwLightGroup.html)                                                                                             |
| Preview [`GeometryBuilder`](/api/@sw-file-lib/geometry/classes/GeometryBuilder) | [`bufferGeometryFromBuilder()`](/api/@sw-file-lib/three/functions/bufferGeometryFromBuilder)                                                                                    |
| Stormworks-style material                                                       | [`createSwMaterials()`](/api/@sw-file-lib/three/functions/createSwMaterials)                                                                                                    |

For most vehicle viewers, [`VehicleBodyAssembler`](/api/@sw-file-lib/three/classes/VehicleBodyAssembler) and [`createVehicleAssetResolver()`](/api/@sw-file-lib/three/functions/createVehicleAssetResolver) are the recommended entry point, as they handle asset loading, caching, coordinate conversion, and mesh creation automatically.
