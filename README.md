# sw-file-lib

**THIS IS WIP**

A monorepo containing libraries and tools for working with Stormworks files.

## Overview

`sw-file-lib` provides reusable libraries for reading, writing, generating, and converting Stormworks data.

The project is organized as a pnpm workspace, allowing each package to remain focused while sharing common tooling and configuration.

## Packages

| Package              | Description                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| `@sw-file-lib/core`  | Binary parse and serialization, geometry generation. No runtime dependencies.                             |
| `@sw-file-lib/xml`   | XML parse and serialization, math utilities, and geometry generation. Depends on fast-xml-parser and zod. |
| `@sw-file-lib/three` | Integration with three.js, including Stormworks-style materials and geometry conversion.                  |

Additional packages may be added as the project grows.

## Repository Structure

```text
packages/
├── core/
├── xml/
└── three/
```

## Requirements

- Node.js 24+
- pnpm

## Installation

```sh
pnpm install
```

## Development

Build all packages:

```sh
pnpm build
```

Run tests:

```sh
pnpm test
```

Run lint:

```sh
pnpm lint
```

Format source code:

```sh
pnpm fmt
```

## Design Goals

- Zero runtime dependencies in the core package.
- Browser and Node.js support.
- three.js integration provided as a separate package.
- Strongly typed APIs.
- Reusable components for future Stormworks tools.

## License

MIT
