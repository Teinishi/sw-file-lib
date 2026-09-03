# Introduction

`@sw-file-lib` is a TypeScript toolkit for reading, writing Stormworks files, and rendering Stormworks components and vehicles.
It provides modular packages for binary formats, XML schemas, geometry generation, and Three.js integration.

This guide walks through the library from installation to building a complete vehicle preview.

## Features

- **Modular packages** — Install only the features you need with minimal dependencies.
- **Binary formats** — Parse and serialize Stormworks mesh, physics, and other binary assets.
- **Type-safe XML** — Read and write vehicle and component XML with fully typed schemas.
- **Geometry generation** — Build 3D geometry that can be saved as Stormworks' mesh format, and/or rendered with Three.js.
- **Three.js integration** — Create meshes and materials that match Stormworks rendering.

## Installation

Choose the packages you need.

::: code-group

```sh [npm]
npm install @sw-file-lib/core
npm install @sw-file-lib/xml
npm install @sw-file-lib/geometry
npm install @sw-file-lib/three
```

```sh [yarn]
yarn add @sw-file-lib/core
yarn add @sw-file-lib/xml
yarn add @sw-file-lib/geometry
yarn add @sw-file-lib/three
```

```sh [pnpm]
pnpm add @sw-file-lib/core
pnpm add @sw-file-lib/xml
pnpm add @sw-file-lib/geometry
pnpm add @sw-file-lib/three
```

```sh [bun]
bun add @sw-file-lib/core
bun add @sw-file-lib/xml
bun add @sw-file-lib/geometry
bun add @sw-file-lib/three
```

:::

### Available packages

| Package                                                | Description                                                            |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| [`@sw-file-lib/core`](/api/@sw-file-lib/core/)         | Binary parsers, serializers, math utilities, and shared types.         |
| [`@sw-file-lib/xml`](/api/@sw-file-lib/xml/)           | Type-safe Stormworks XML schemas and serialization.                    |
| [`@sw-file-lib/geometry`](/api/@sw-file-lib/geometry/) | Geometry generation for component and surface processing for vehicles. |
| [`@sw-file-lib/three`](/api/@sw-file-lib/three/)       | Three.js helpers for meshes, materials, and rendering.                 |

Additional packages can be installed together:

::: code-group

```sh [npm]
npm install @sw-file-lib/core @sw-file-lib/xml @sw-file-lib/geometry @sw-file-lib/three
```

```sh [yarn]
yarn add @sw-file-lib/core @sw-file-lib/xml @sw-file-lib/geometry @sw-file-lib/three
```

```sh [pnpm]
pnpm add @sw-file-lib/core @sw-file-lib/xml @sw-file-lib/geometry @sw-file-lib/three
```

```sh [bun]
bun add @sw-file-lib/core @sw-file-lib/xml @sw-file-lib/geometry @sw-file-lib/three
```

:::
