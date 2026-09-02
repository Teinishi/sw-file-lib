# Reading and Writing Binary Files

[`@sw-file-lib/core`](/api/@sw-file-lib/core) provides parsers and serializers for Stormworks binary asset formats. All parsers operate on `ArrayBuffer`, making them compatible with both browsers and Node.js.

This guide uses the mesh format as an example, but the workflow is the same for other binary formats.

## Parse a file

Read the file into a bytes array and pass it to the parser.

Accepted type: `ArrayBuffer | ArrayBufferView | Uint8Array`

```ts
import { parseMesh } from "@sw-file-lib/core";

const buffer = await file.arrayBuffer();
const mesh = parseMesh(buffer);
```

The returned object is fully typed and can be inspected or modified directly. For example, `.mesh` files are parsed into [`MeshData`](/api/@sw-file-lib/core/interfaces/MeshData.html).

## Access mesh data

Render mesh data (.mesh) contains flat vertex and indices array, and groups that points a range in the indices array.

```ts
console.log(mesh.vertices.length);
console.log(mesh.indices.length);
for (const group of mesh.groups) {
  console.log(group.name);
  console.log(group.indexBufferStart);
  console.log(group.indexBufferLength);
}
```

Vertices, indices, and groups are exposed as plain TypeScript objects rather than raw binary data.

## Create mesh data

Mesh data can be crated from scratch, or can be edited from existing ones.

```ts
import { MeshData } from "@sw-file-lib/core";

const mesh: MeshData = {
  kind: "mesh",
  vertices: [
    {
      position: { x: 1, y: 0, z: -1 },
      color: { r: 153, g: 153, b: 153, a: 255 },
      normal: { x: 0, y: 1, z: 0 },
    },
    {
      position: { x: -1, y: 0, z: 1 },
      color: { r: 153, g: 153, b: 153, a: 255 },
      normal: { x: 0, y: 1, z: 0 },
    },
    {
      position: { x: -1, y: 0, z: -1 },
      color: { r: 153, g: 153, b: 153, a: 255 },
      normal: { x: 0, y: 1, z: 0 },
    },
    {
      position: { x: 1, y: 0, z: 1 },
      color: { r: 153, g: 153, b: 153, a: 255 },
      normal: { x: 0, y: 1, z: 0 },
    },
  ],
  indices: [0, 1, 2, 0, 3, 1],
  groups: [
    {
      indexBufferStart: 0,
      indexBufferLength: 6,
      materialIndex: 0,
      boundsMin: { x: -1, y: 0, z: -1 },
      boundsMax: { x: 1, y: 0, z: 1 },
      name: "Plane",
    },
  ],
};
```

## Serialize

Use the matching serializer to generate a new binary file.

```ts
import { serializeMesh } from "@sw-file-lib/core";

const output = serializeMesh(mesh);
// Uint8Array<ArrayBuffer>
```

The resulting `Uint8Array<ArrayBuffer>` can be saved to disk, uploaded, or used directly in your application.

## Supported formats

[`@sw-file-lib/core`](/api/@sw-file-lib/core) includes parsers and serializers for several Stormworks binary formats.

| Format        | Parse                                                                     | Serialize                                                                         |
| ------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Mesh          | [`parseMesh`](/api/@sw-file-lib/core/functions/parseMesh)                 | [`serializeMesh`](/api/@sw-file-lib/core/functions/serializeMesh)                 |
| Physics       | [`parsePhys`](/api/@sw-file-lib/core/functions/parsePhys)                 | [`serializePhys`](/api/@sw-file-lib/core/functions/serializePhys)                 |
| Component mod | [`parseComponentMod`](/api/@sw-file-lib/core/functions/parseComponentMod) | [`serializeComponentMod`](/api/@sw-file-lib/core/functions/serializeComponentMod) |
