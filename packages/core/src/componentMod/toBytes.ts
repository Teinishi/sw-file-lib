import { BinaryWriter } from "../binary";
import type { ComponentMod } from "./types";

/**
 * Serialize a component mod definition and bundled assets to Stormworks `.bin`
 * bytes.
 *
 * Passing `name` writes the newer v1 layout. Omitting it writes the legacy v0
 * layout.
 */
export function componentModToBytes(componentMod: ComponentMod) {
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
