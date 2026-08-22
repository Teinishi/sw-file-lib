import { BinaryReader, type BinaryReaderInput } from "../binary";
import type { ParsedComponentMod, ParsedComponentModAsset } from "./types";

/**
 * Parse a Stormworks component mod `.bin` payload.
 *
 * The returned object distinguishes legacy files that do not include a name
 * (`version: 0`) from newer files that do (`version: 1`).
 */
export function componentModFromBytes(input: BinaryReaderInput): ParsedComponentMod {
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
