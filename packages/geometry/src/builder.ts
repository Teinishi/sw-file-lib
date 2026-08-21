import * as earcut from "earcut";
import type { DeepReadonly } from "ts-essentials";
import type { MeshData, MeshVertex, Vec2, Vec3, Mat3, Color } from "@sw-file-lib/core";
import { addVec3, detMat3, mulMat3Vec3 } from "@sw-file-lib/internal-utils";

const DEFAULT_OPAQUE_COLOR = {
  r: 255,
  g: 255,
  b: 255,
};
const DEFAULT_GLASS_COLOR = {
  r: 160,
  g: 160,
  b: 199,
  a: 128,
};
const DEFAULT_ADDITIVE_COLOR = {
  r: 255,
  g: 255,
  b: 255,
};

function computeNormal(a: Readonly<Vec3>, b: Readonly<Vec3>, c: Readonly<Vec3>): Vec3 {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;

  const acx = c.x - a.x;
  const acy = c.y - a.y;
  const acz = c.z - a.z;

  const nx = aby * acz - abz * acy;
  const ny = abz * acx - abx * acz;
  const nz = abx * acy - aby * acx;

  const len = Math.hypot(nx, ny, nz);

  if (len === 0) {
    return { x: 0, y: 0, z: 1 };
  }

  return {
    x: nx / len,
    y: ny / len,
    z: nz / len,
  };
}

function getVertexFromFlat(flatVertices: readonly number[], index: number): Vec3 | null {
  if (index < 0 || flatVertices.length < index * 3 + 3) {
    return null;
  }
  return {
    x: flatVertices[3 * index]!,
    y: flatVertices[3 * index + 1]!,
    z: flatVertices[3 * index + 2]!,
  };
}

function vec2RingToTuple(ring: DeepReadonly<Vec2[]>, z?: number) {
  return ring.map((p) => (z === undefined ? [p.x, p.y] : [p.x, p.y, z]));
}

interface GeometryGroup {
  start: number;
  length: number;
  materialIndex: number;
}

export interface GeometryBuilderOptions {
  refine?: boolean;
}

export interface AddFaceOptions {
  materialIndex?: number;
  color?: Color;
  flip?: boolean;
}

export interface AddPolygonOptions extends AddFaceOptions {
  z?: number;
}

export interface AddExtrudedSideOptions extends AddFaceOptions {
  close?: boolean;
  zRange: [number, number];
}

export class GeometryBuilder {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly colors: number[] = [];
  private readonly indices: number[] = [];
  private readonly groups: GeometryGroup[] = [];
  refine: boolean;

  constructor(options?: Readonly<GeometryBuilderOptions>) {
    this.refine = options?.refine ?? false;
  }

  private addCoplanarTriangles(
    flatVertices: readonly number[],
    indices: readonly number[],
    options?: DeepReadonly<AddFaceOptions>,
  ) {
    if (indices.length < 3) {
      throw new Error("Indices must have at least 3 vertices.");
    }
    if (indices.length % 3 !== 0) {
      throw new Error("the length of indices must be multiples of 3.");
    }

    const materialIndex = options?.materialIndex ?? 0;
    let color: Color = DEFAULT_OPAQUE_COLOR;
    if (options?.color) {
      color = options.color;
    } else if (materialIndex === 1) {
      color = DEFAULT_GLASS_COLOR;
    } else if (materialIndex === 2) {
      color = DEFAULT_ADDITIVE_COLOR;
    }
    const red = color.r / 255;
    const green = color.g / 255;
    const blue = color.b / 255;

    const normal = computeNormal(
      getVertexFromFlat(flatVertices, indices[0]!)!,
      getVertexFromFlat(flatVertices, indices[1]!)!,
      getVertexFromFlat(flatVertices, indices[2]!)!,
    );
    if (options?.flip) {
      normal.x *= -1;
      normal.y *= -1;
      normal.z *= -1;
    }

    const base = this.positions.length / 3;

    this.positions.push(...flatVertices);
    for (let i = 0; i < flatVertices.length / 3; i++) {
      this.normals.push(normal.x, normal.y, normal.z);
      this.colors.push(red, green, blue);
    }

    const groupStart = this.indices.length;
    for (let i = 0; i + 2 < indices.length; i += 3) {
      const tri = indices.slice(i, i + 3);
      if (options?.flip) {
        this.indices.push(base + tri[0]!, base + tri[2]!, base + tri[1]!);
      } else {
        this.indices.push(base + tri[0]!, base + tri[1]!, base + tri[2]!);
      }
    }

    const prevGroup = this.groups[this.groups.length - 1];
    if (prevGroup?.materialIndex === materialIndex) {
      prevGroup.length = this.indices.length - prevGroup.start;
    } else {
      this.groups.push({
        start: groupStart,
        length: this.indices.length - groupStart,
        materialIndex,
      });
    }
  }

  // 凸多角形面
  addFace(
    vertices: DeepReadonly<Vec3[]>,
    options?: number | Readonly<Color> | DeepReadonly<AddFaceOptions>,
  ) {
    if (vertices.length < 3) {
      return;
    }

    const normalizedOptions: AddFaceOptions = {};
    if (typeof options === "number") {
      normalizedOptions.materialIndex = options;
    } else if (options !== undefined && "r" in options) {
      normalizedOptions.color = options;
    } else {
      Object.assign(normalizedOptions, options);
    }

    const indices = [];
    for (let i = 0; i < vertices.length - 2; i++) {
      indices.push(0, i + 1, i + 2);
    }

    const flatVertices = vertices.flatMap((v) => [v.x, v.y, v.z]);

    this.addCoplanarTriangles(flatVertices, indices, normalizedOptions);
  }

  // ポリゴンを追加 (polygon[0] は外周、それ以降は内側の穴)
  addPolygon(polygon: DeepReadonly<Vec2[][]>, options?: DeepReadonly<AddPolygonOptions>) {
    const z = options?.z ?? 0;

    const data = earcut.flatten(polygon.map((ring) => vec2RingToTuple(ring, z)));
    const indices = earcut.default(data.vertices, data.holes, data.dimensions);
    if (this.refine) {
      earcut.refine(indices, data.vertices, data.dimensions);
    }

    this.addCoplanarTriangles(data.vertices, indices, options);
  }

  // ポリゴンをZ軸方向に押し出した側面
  addExtrudedSides(vertices: DeepReadonly<Vec2[]>, options?: DeepReadonly<AddExtrudedSideOptions>) {
    const [z1, z2] = options?.zRange ?? [0, 1];

    const quadCount = options?.close ? vertices.length : vertices.length - 1;

    for (let i = 0; i < quadCount; i++) {
      const { x: ax, y: ay } = vertices[i]!;
      const { x: bx, y: by } = vertices[(i + 1) % vertices.length]!;

      if ((bx - ax) ** 2 + (by - ay) ** 2 === 0) {
        continue;
      }

      const quad = [
        { x: ax, y: ay, z: z1 },
        { x: ax, y: ay, z: z2 },
        { x: bx, y: by, z: z2 },
        { x: bx, y: by, z: z1 },
      ];

      this.addFace(quad, options);
    }
  }

  transform(mat?: Readonly<Mat3>, translation?: Readonly<Vec3>) {
    const { positions, normals } = this;
    for (let i = 0; 3 * i + 2 < positions.length; i++) {
      let p = getVertexFromFlat(positions, i)!;
      let n = getVertexFromFlat(normals, i)!;
      if (mat) {
        p = mulMat3Vec3(mat, p);
        n = mulMat3Vec3(mat, n);
      }
      if (translation) {
        p = addVec3(p, translation);
      }
      positions[3 * i] = p.x;
      positions[3 * i + 1] = p.y;
      positions[3 * i + 2] = p.z;
      normals[3 * i] = n.x;
      normals[3 * i + 1] = n.y;
      normals[3 * i + 2] = n.z;
    }

    if (mat && detMat3(mat) < 0) {
      const { indices } = this;
      for (let i = 0; 3 * i + 2 < indices.length; i++) {
        const tmp = indices[3 * i + 1]!;
        indices[3 * i + 1] = indices[3 * i + 2]!;
        indices[3 * i + 2] = tmp;
      }
    }
  }

  // 別の GeometryBuilder とマージ
  merge(other: GeometryBuilder) {
    const vertexOffset = this.positions.length / 3;
    const indexOffset = this.indices.length;
    if (!Number.isInteger(vertexOffset)) {
      throw new Error("Unexpected: GeometryBuilder position length is not multiples of 3.");
    }

    chunkPush(this.positions, other.positions);
    chunkPush(this.normals, other.normals);
    chunkPush(this.colors, other.colors);

    chunkPush(
      this.indices,
      other.indices.map((i) => i + vertexOffset),
    );

    chunkPush(
      this.groups,
      other.groups.map((g) => ({
        ...g,
        start: g.start + indexOffset,
      })),
    );
  }

  toBufferGeometryAttributes() {
    return {
      position: new Float32Array(this.positions),
      normal: new Float32Array(this.normals),
      color: new Float32Array(this.colors),
      index: new Uint32Array(this.indices),
      groups: this.groups.map((g) => ({ ...g })),
    };
  }

  toMeshData(): MeshData {
    const { positions, colors, normals, indices } = this;
    const vertexCount = positions.length / 3;
    if (!Number.isInteger(vertexCount)) {
      throw new Error("GeometryBuilder.positions must have a length multiples of 3.");
    }
    if (vertexCount !== colors.length / 3) {
      throw new Error("Mismatch of size between positions and colors.");
    }
    if (vertexCount !== normals.length / 3) {
      throw new Error("Mismatch of size between positions and normals.");
    }

    const vertices: MeshVertex[] = [];
    for (let i = 0; i < vertexCount; i++) {
      vertices.push({
        position: {
          x: positions[3 * i]!,
          y: positions[3 * i + 1]!,
          z: -positions[3 * i + 2]!,
        },
        color: {
          r: Math.round(colors[3 * i]! * 255),
          g: Math.round(colors[3 * i + 1]! * 255),
          b: Math.round(colors[3 * i + 2]! * 255),
          a: 255,
        },
        normal: {
          x: normals[3 * i]!,
          y: normals[3 * i + 1]!,
          z: -normals[3 * i + 2]!,
        },
      });
    }

    const groups = this.groups
      .map(({ start, length, materialIndex }, i) => {
        let boundsMin, boundsMax;
        for (const j of indices.slice(start, start + length)) {
          if (j < 0 || vertexCount <= j) continue;
          const x = positions[3 * j]!;
          const y = positions[3 * j + 1]!;
          const z = positions[3 * j + 2]!;

          if (!boundsMin) {
            boundsMin = { x, y, z };
          } else {
            boundsMin.x = Math.min(boundsMin.x, x);
            boundsMin.y = Math.min(boundsMin.y, y);
            boundsMin.z = Math.min(boundsMin.z, z);
          }

          if (!boundsMax) {
            boundsMax = { x, y, z };
          } else {
            boundsMax.x = Math.max(boundsMax.x, x);
            boundsMax.y = Math.max(boundsMax.y, y);
            boundsMax.z = Math.max(boundsMax.z, z);
          }
        }

        if (!boundsMin || !boundsMax) return null;

        return {
          indexBufferStart: start,
          indexBufferLength: length,
          materialId: materialIndex,
          boundsMin,
          boundsMax,
          name: `material-${i}`,
        };
      })
      .filter((v) => v !== null);

    return {
      kind: "mesh",
      vertices,
      indices,
      groups,
    };
  }
}

const CHUNK = 65536;

function chunkPush<T>(dest: T[], arr: T[]) {
  for (let i = 0; i < arr.length; i += CHUNK) {
    dest.push(...arr.slice(i, i + CHUNK));
  }
}
