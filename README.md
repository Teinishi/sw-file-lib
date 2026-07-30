# sw-file-lib

A monorepo containing libraries and tools for working with Stormworks files.

## Overview

`sw-file-lib` provides reusable libraries for reading, writing, generating, and converting Stormworks data.

The project is organized as a pnpm workspace, allowing each package to remain focused while sharing common tooling and configuration.

## Packages

| Package                 | Description                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `@sw-file-lib/core`    | Core data structures, binary/XML serialization, math utilities, and geometry generation. No runtime dependencies. |
| `@sw-file-lib/three`   | Integration with three.js, including geometry conversion and Stormworks-style materials.                          |
| `@sw-file-lib/node`    | Node.js utilities such as file I/O and archive handling.                                                          |

Additional packages may be added as the project grows.

## Repository Structure

```text
packages/
├── core/
├── three/
└── node/
```

## Requirements

* Node.js 24+
* pnpm

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

* Zero runtime dependencies in the core package.
* Browser and Node.js support.
* three.js integration provided as a separate package.
* Strongly typed APIs.
* Reusable components for future Stormworks tools.

## License

MIT
