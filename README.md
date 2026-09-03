# sw-file-lib

TypeScript libraries for reading, writing, and rendering **Stormworks** assets.

`sw-file-lib` is a modular monorepo that provides strongly typed APIs for working with Stormworks file formats. Each package can be used independently, and packages only depend on the functionality they need.

## Features

- 📦 Modular packages for binary, XML, geometry, and Three.js
- 🔒 Fully typed APIs designed for TypeScript
- 🧩 XML schema system with type inference
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

## Documentation

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
