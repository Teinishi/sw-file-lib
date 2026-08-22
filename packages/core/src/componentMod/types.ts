/** An auxiliary file bundled into a Stormworks component mod `.bin` file. */
export interface ComponentModAsset {
  /** File name stored for the bundled asset. */
  name: string;
  /** Asset payload. Strings are written as UTF-8; byte arrays are written as-is. */
  data: string | Uint8Array;
}

/** Data used to create a Stormworks component mod `.bin` file. */
export interface ComponentMod {
  /** Component display/internal name. When omitted, the legacy v0 layout is written. */
  name?: string;
  /** Component definition XML payload. */
  definition: string;
  /** Additional files to bundle in the `.bin` file. */
  assets: ComponentModAsset[];
}

/** Parsed asset entry from a Stormworks component mod `.bin` file. */
export interface ParsedComponentModAsset {
  /** File name stored for the asset. */
  name: string;
  /** Asset payload bytes. */
  data: Uint8Array;
  /** Byte length declared in the file for {@link data}. */
  dataSize: number;
}

/** Parsed legacy component mod layout used before Stormworks v1.15.11. */
export interface ParsedComponentModV0 {
  /** File layout version. Version `0` files do not store a component name. */
  version: 0;
  /** Total byte size declared by the file. */
  dataSize: number;
  /** Component definition XML payload. */
  definition: string;
  /** Asset files bundled with the component. */
  assets: ParsedComponentModAsset[];
}

/** Parsed component mod layout used by Stormworks v1.15.11 and later. */
export interface ParsedComponentModV1 {
  /** File layout version. Version `1` files include a component name. */
  version: 1;
  /** Total byte size declared by the file. */
  dataSize: number;
  /** Component name stored in the file. */
  name: string;
  /** Component definition XML payload. */
  definition: string;
  /** Asset files bundled with the component. */
  assets: ParsedComponentModAsset[];
}

/** Parsed component mod data from either supported binary layout. */
export type ParsedComponentMod = ParsedComponentModV0 | ParsedComponentModV1;
