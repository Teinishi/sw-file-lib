import type { MeshColor4, MeshData, MeshGroup, MeshVec3, MeshVertex, PhysData, PhysGroup } from ".";
import { BinaryReader } from "../binary";

export class MeshReader extends BinaryReader {
  parseMeshOrPhys(): MeshData | PhysData {
    const signature = this.readAscii(4);

    if (signature === "mesh") {
      return this.parseMeshBody();
    }

    if (signature === "phys") {
      return this.parsePhysBody();
    }

    throw new Error(`File signature "mesh" or "phys" expected, got "${signature}".`);
  }

  parseMesh(): MeshData {
    const signature = this.readAscii(4);

    if (signature === "mesh") {
      return this.parseMeshBody();
    }

    throw new Error(`File signature "mesh" expected, got "${signature}".`);
  }

  parsePhys(): PhysData {
    const signature = this.readAscii(4);

    if (signature === "phys") {
      return this.parsePhysBody();
    }

    throw new Error(`File signature "mesh" expected, got "${signature}".`);
  }

  private parseMeshBody(): MeshData {
    const h0 = this.readU16();
    const h1 = this.readU16();
    const vertexCount = this.readU16();
    const h3 = this.readU16();
    const h4 = this.readU16();

    const vertices: MeshVertex[] = [];
    for (let i = 0; i < vertexCount; i++) {
      const position = this.readVec3();
      const color = this.readColor4();
      const normal = this.readVec3();
      vertices.push({ position, color, normal });
    }

    const indexCount = this.readU32();
    const indices: number[] = [];
    for (let i = 0; i < indexCount; i++) {
      indices.push(this.readU16());
    }

    const groupCount = this.readU16();
    const groups: MeshGroup[] = [];
    for (let i = 0; i < groupCount; i++) {
      const indexBufferStart = this.readU32();
      const indexBufferLength = this.readU32();
      const h2 = this.readU16();
      const materialIndex = this.readU16();
      const boundsMin = this.readVec3();
      const boundsMax = this.readVec3();
      const h6 = this.readU16();
      const nameLength = this.readU16();
      const name = this.readUtf8(nameLength);
      const h8 = this.readVec3();

      void h0;
      void h1;
      void h2;
      void h3;
      void h4;
      void h6;
      void h8;

      groups.push({
        indexBufferStart,
        indexBufferLength,
        materialIndex,
        boundsMin,
        boundsMax,
        name,
      });
    }

    return { kind: "mesh", vertices, indices, groups: groups };
  }

  private parsePhysBody(): PhysData {
    const h0 = this.readU16();
    const groupCount = this.readU16();

    const groups: PhysGroup[] = [];
    for (let i = 0; i < groupCount; i++) {
      const vertexCount = this.readU16();
      const vertices: MeshVec3[] = [];
      for (let j = 0; j < vertexCount; j++) {
        vertices.push(this.readVec3());
      }

      const indicesCount = this.readU16();
      const indices: number[] = [];
      for (let j = 0; j < indicesCount; j++) {
        indices.push(this.readU32());
      }

      groups.push({ vertices, indices });
    }

    void h0;
    return { kind: "phys", groups: groups };
  }

  private readVec3(): MeshVec3 {
    return {
      x: this.readF32(),
      y: this.readF32(),
      z: this.readF32(),
    };
  }

  private readColor4(): MeshColor4 {
    return {
      r: this.readU8(),
      g: this.readU8(),
      b: this.readU8(),
      a: this.readU8(),
    };
  }
}
