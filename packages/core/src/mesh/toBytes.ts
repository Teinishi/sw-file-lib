import type { DeepReadonly } from "ts-essentials";
import { BinaryWriter } from "../binary";
import type {
  MeshColor4,
  MeshData,
  MeshVec3,
  MeshVertex,
  MeshGroup,
  PhysData,
  PhysGroup,
} from "./types";

export function meshDataToBytes(data: Readonly<MeshData>) {
  const writer = new MeshWriter();
  writer.writeAscii("mesh");
  writer.writeU16(7);
  writer.writeU16(1);
  writer.writeU16(data.vertices.length);
  writer.writeU16(19);
  writer.writeU16(0);

  for (const vertex of data.vertices) {
    writer.writeMeshVertex(vertex);
  }

  writer.writeU32(data.indices.length);
  for (const i of data.indices) {
    writer.writeU16(i);
  }

  writer.writeU16(data.groups.length);
  for (const group of data.groups) {
    writer.writeMeshGroup(group);
  }

  writer.writeU16(0);

  return writer.toUint8Array();
}

export function physDataToBytes(data: Readonly<PhysData>) {
  const writer = new MeshWriter();
  writer.writeAscii("phys");
  writer.writeU16(2);
  writer.writeU16(data.groups.length);

  for (const group of data.groups) {
    writer.writePhysGroup(group);
  }

  return writer.toUint8Array();
}

class MeshWriter extends BinaryWriter {
  writeVec3(data: Readonly<MeshVec3>) {
    this.writeF32(data.x);
    this.writeF32(data.y);
    this.writeF32(data.z);
  }

  writeColor4(data: Readonly<MeshColor4>) {
    this.writeU8(data.r);
    this.writeU8(data.g);
    this.writeU8(data.b);
    this.writeU8(data.a);
  }

  writeMeshVertex(vertex: DeepReadonly<MeshVertex>) {
    this.writeVec3(vertex.position);
    this.writeColor4(vertex.color);
    this.writeVec3(vertex.normal);
  }

  writeMeshGroup(data: DeepReadonly<MeshGroup>) {
    this.writeU32(data.indexBufferStart);
    this.writeU32(data.indexBufferLength);
    this.writeU16(0);
    this.writeU16(data.materialId);

    this.writeVec3(data.boundsMin);
    this.writeVec3(data.boundsMax);

    this.writeU16(0);
    this.withSize(2, (writer) => writer.writeUtf8(data.name));

    this.writeVec3({ x: 1, y: 1, z: 1 });
  }

  writePhysGroup(data: DeepReadonly<PhysGroup>) {
    this.writeU16(data.vertices.length);
    for (const vertex of data.vertices) {
      this.writeVec3(vertex);
    }

    this.writeU16(data.indices.length);
    for (const index of data.indices) {
      this.writeU32(index);
    }
  }
}
