# sw-file-lib

TypeScript libraries for reading, writing, and rendering **Stormworks** assets.

`sw-file-lib` is a modular monorepo that provides strongly typed APIs for working with Stormworks file formats. Each package can be used independently, and packages only depend on the functionality they need.

## Features

- 📦 Modular packages for binary, XML, geometry, and Three.js
- 🔒 Fully typed APIs designed for TypeScript
- 🧩 XML schema system with type inference
- 📐 Vector, matrix, and color utilities
- 🎮 Three.js integration with Stormworks coordinate conversion
- 🚫 Zero dependencies in the core package

## Packages

| Package                       | Description                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `@sw-file-lib/core`           | Binary file reading and writing                                                |
| `@sw-file-lib/core/math`      | Vectors, matrices, orientation, and math utilities                             |
| `@sw-file-lib/core/color`     | Color types and parse utility                                                  |
| `@sw-file-lib/xml`            | Parser, serializer, and typed schemas for Stormworks XML files                 |
| `@sw-file-lib/xml/xml-schema` | Library for defining typed XML schemas                                         |
| `@sw-file-lib/geometry`       | Geometry construction, mesh generation, and surface operations such as culling |
| `@sw-file-lib/three`          | Three.js helpers including coordinate conversion, mesh creation, and materials |

## Installation

Install only the packages you need.

```bash
npm install @sw-file-lib/core
npm install @sw-file-lib/xml
npm install @sw-file-lib/geometry
npm install @sw-file-lib/three
```

## Quick examples

### Read and write binary data

```ts
import { BinaryReader, BinaryWriter } from "@sw-file-lib/core";

const input = new Uint8Array([0x78, 0x56, 0x34, 0x12]);

const reader = new BinaryReader(input);
const value = reader.uint32(); // 0x12345678

const writer = new BinaryWriter();
writer.uint32(value);

const output = writer.build();
console.log(output);
```

### XML with schemas

```ts
import { x } from "@sw-file-lib/xml";

const exampleSchema = x.object({
  name: x.string(),
  value: x.number(),
});

const xml = '<example name="Hello" value="3.14"/>';

const data = exampleSchema.parse(xml, "example");

console.log(data.name); // "Hello"
console.log(data.value); // 3.14
```

### Vector math

```ts
import { vec3, Mat3 } from "@sw-file-lib/core/math";

const position = vec3(1, 2, 3);
const transformed = mulMat3Vec3([1, 0, 0, 0, 1, 0, 0, 0, 1], position);
```

### Three.js integration

```ts
// todo: example code
```

## Package overview

### `@sw-file-lib/core`

The foundation package of the library.

It currently provides binary file reading and writing with a lightweight, dependency-free implementation.

- Binary reader and writer
- Types, reader, and writer for mesh and component mod binary data

Subpath exports:

- `@sw-file-lib/core/math`
- `@sw-file-lib/core/color`

### `@sw-file-lib/xml`

A strongly typed XML library built around schemas.

- XML parsing and serialization
- Attribute and element schemas
- Type inference from schema definitions
- Detailed validation errors with XML paths

### `@sw-file-lib/geometry`

Utilities for constructing and processing 3D geometry.

- `GeometryBuilder`
- Surface generation
- Surface culling

### `@sw-file-lib/three`

Helpers for displaying Stormworks assets in Three.js.

- Stormworks to Three.js coordinate conversion
- Mesh and material creation

## Requirements

- Node.js 24+
- pnpm

---

# Development

This section is only relevant if you want to contribute to the library itself.

## Repository structure

```text
packages/
  core/
  xml/
  geometry/
  three/
```

Each package is independently buildable and publishable while sharing the same workspace.

## Build

```bash
pnpm install
pnpm build
```

## Test

```bash
pnpm test
```

## Type check

```bash
pnpm typecheck
```

## Design Goals

- Zero runtime dependencies in the core package.
- Browser and Node.js support.
- three.js integration provided as a separate package.
- Strongly typed APIs.

## License

MIT
