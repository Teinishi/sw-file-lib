# Generating Geometry

[`@sw-file-lib/geometry`](/api/@sw-file-lib/geometry) provides utilities for procedurally generating Stormworks mesh data. The central class is [`GeometryBuilder`](/api/@sw-file-lib/geometry/classes/GeometryBuilder), which lets you construct geometry one face at a time and export it as [`MeshData`](/api/@sw-file-lib/core/interfaces/MeshData).

This is designed for tools that automatically generate or modify meshes, rather than importing existing model files.

## Create a GeometryBuilder

Start with an empty builder.

```ts
import { GeometryBuilder } from "@sw-file-lib/geometry";

const builder = new GeometryBuilder();
```

## Add faces

Each face is defined by three or more vertices in 3D space. The builder automatically generates normals and stores the face in Stormworks mesh format.

```ts
builder.addFace(
  [
    { x: -0.5, y: 0, z: -0.5 },
    { x: 0.5, y: 0, z: -0.5 },
    { x: 0.5, y: 1, z: -0.5 },
    { x: -0.5, y: 1, z: -0.5 },
  ],
  { r: 255, g: 0, b: 0 },
);
```

Repeat this for each side to construct a complete solid.

```ts
// Front
builder.addFace(/* ... */);

// Back
builder.addFace(/* ... */);

// Left, Right, Top, Bottom...
```

## Export as MeshData

When the geometry is complete, convert it into [`MeshData`](/api/@sw-file-lib/core/interfaces/MeshData).

```ts
const meshData = builder.toMeshData();
```

The returned object is compatible with [`serializeMesh()`](/api/@sw-file-lib/core/functions/serializeMesh.html) from [`@sw-file-lib/core`](/api/@sw-file-lib/core), allowing it to be written directly as a Stormworks mesh file.

```ts
import { serializeMesh } from "@sw-file-lib/core";

const buffer = serializeMesh(meshData);
```

## Typical workflow

[`GeometryBuilder`](/api/@sw-file-lib/geometry/classes/GeometryBuilder) is intended for procedural mesh generation.

1. Generate vertices and faces from your tool's logic.
2. Add each face with [`addFace()`](/api/@sw-file-lib/geometry/classes/GeometryBuilder#addface).
3. Export using [`toMeshData()`](/api/@sw-file-lib/geometry/classes/GeometryBuilder#toMeshData).
4. Serialize with [`serializeMesh()`](/api/@sw-file-lib/core/functions/serializeMesh.html).

This approach is ideal for generators, converters, and other tools that create Stormworks meshes entirely from code.
