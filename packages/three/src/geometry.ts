import { BufferAttribute, BufferGeometry } from "three";
import type { GeometryBuilder } from "@sw-file-lib/geometry";

export function applyBuilderOnBufferGeometry(builder: GeometryBuilder, buffer: BufferGeometry) {
  buffer.clearGroups();

  const { position, normal, color, index, groups } = builder.toBufferGeometryAttributes();

  buffer.setAttribute("position", new BufferAttribute(position, 3));
  buffer.setAttribute("normal", new BufferAttribute(normal, 3));
  buffer.setAttribute(
    "color",
    new BufferAttribute(
      color.map((v) => v / 255),
      4,
    ),
  );
  buffer.setIndex(new BufferAttribute(new Uint32Array(index), 1));
  for (const { start, length, materialIndex } of groups) {
    buffer.addGroup(start, length, materialIndex);
  }
}

export function bufferGeometryFromBuilder(builder: GeometryBuilder): BufferGeometry {
  const buffer = new BufferGeometry();
  applyBuilderOnBufferGeometry(builder, buffer);
  return buffer;
}
