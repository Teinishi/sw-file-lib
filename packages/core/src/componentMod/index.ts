import { BinaryReader, BinaryWriter, type BinaryReaderInput } from "..";

/**
 * An additional asset contained in a Stormworks component mod.
 *
 * Assets may represent meshes, audio, lua scripts, or other binary resources.
 * The `data` field may be either a UTF-8 string or raw binary data.
 */
export interface ComponentModAsset {
  /** Asset file name, including its extension. */
  name: string;
  /** Asset contents. */
  data: string | Uint8Array;
}

/**
 * A Stormworks component mod.
 *
 * A component mod always contains a component definition XML and may optionally
 * contain additional assets. Since Stormworks v1.15.11, the definition file
 * name is also stored in the binary format.
 */
export interface ComponentMod {
  /**
   * Definition file name without the `.xml` extension.
   *
   * When omitted, the legacy v0 layout is written. When provided, the v1 layout
   * is written.
   */
  name?: string;
  /** Component definition XML. */
  definition: string;
  /** Additional assets included in the component mod. */
  assets: ComponentModAsset[];
}

/**
 * Parsed asset entry from a component mod binary.
 *
 * Unlike {@link ComponentModAsset}, this preserves the original serialized
 * byte length of the asset.
 */
export interface ParsedComponentModAsset {
  /** Asset file name. */
  name: string;
  /** Raw asset data. */
  data: Uint8Array;
  /** Byte length declared in the file for {@link data}. */
  dataSize: number;
}

/**
 * Parsed version 0 component mod.
 *
 * Used by Stormworks versions before v1.15.11.
 */
export interface ParsedComponentModV0 {
  /** File layout version. Version `0` files do not store a component name. */
  version: 0;
  /** Total byte size declared by the file. */
  dataSize: number;
  /** Component definition XML. */
  definition: string;
  /** Asset files bundled with the component. */
  assets: ParsedComponentModAsset[];
}

/**
 * Parsed version 1 component mod.
 *
 * Introduced in Stormworks v1.15.11, adding the definition file name.
 */
export interface ParsedComponentModV1 {
  /** File layout version. Version `1` files include a component name. */
  version: 1;
  /** Total byte size declared by the file. */
  dataSize: number;
  /** Component name stored in the file. */
  name: string;
  /** Component definition XML. */
  definition: string;
  /** Asset files bundled with the component. */
  assets: ParsedComponentModAsset[];
}

/**
 * Parsed Stormworks component mod.
 */
export type ParsedComponentMod = ParsedComponentModV0 | ParsedComponentModV1;

/**
 * Parses a Stormworks component mod binary.
 *
 * The returned object preserves binary metadata such as the format version
 * and serialized sizes.
 *
 * @param input - Binary data to parse.
 * @returns The parsed component mod.
 */
export function parseComponentMod(input: BinaryReaderInput): ParsedComponentMod {
  const reader = new BinaryReader(input);

  const dataSize = reader.readU32();

  const version = reader.readU32();

  let name, definition;
  if (version === 1) {
    name = reader.readUtf8();
    definition = reader.readUtf8();
  } else {
    definition = reader.readUtf8();
  }

  const assets: ParsedComponentModAsset[] = [];

  const assetCount = reader.readU16();
  for (let i = 0; i < assetCount; i++) {
    const assetName = reader.readUtf8();
    const assetDataSize = reader.readU32();
    const assetData = reader.readBytes(assetDataSize);

    assets.push({
      name: assetName,
      dataSize: assetDataSize,
      data: assetData,
    });
  }

  if (version === 1) {
    return {
      version: 1,
      dataSize,
      name: name!,
      definition,
      assets,
    };
  } else {
    return {
      version: 0,
      dataSize,
      definition,
      assets,
    };
  }
}

/**
 * Serializes a component mod into its binary format.
 *
 * If `componentMod.name` is provided, version 1 is written; otherwise,
 * the legacy version 0 format is produced.
 *
 * String assets are encoded as UTF-8.
 *
 * @param componentMod - Component mod to serialize.
 * @returns The serialized binary data.
 */
export function serializeComponentMod(componentMod: ComponentMod): Uint8Array<ArrayBuffer> {
  const writer = new BinaryWriter();

  writer.withSize(4, (writer) => {
    if (componentMod.name !== undefined) {
      writer.writeU32(1);
      writer.writeUtf8(componentMod.name, true);
    }

    writer.writeUtf8(componentMod.definition, true);

    writer.writeU16(componentMod.assets.length);
    for (const asset of componentMod.assets) {
      writer.writeUtf8(asset.name, true);
      writer.withSize(4, (writer) => {
        if (typeof asset.data === "string") {
          writer.writeUtf8(asset.data, true);
        } else {
          writer.writeBytes(asset.data);
        }
      });
    }
  });

  return writer.toUint8Array();
}
