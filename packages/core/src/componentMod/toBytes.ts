import { BinaryWriter } from "../binary";
import type { ComponentMod } from "./types";

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
