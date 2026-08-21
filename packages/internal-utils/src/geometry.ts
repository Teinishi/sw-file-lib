import type { DeepReadonly } from "ts-essentials";
import { addVec3, crossVec3, dotVec3, mulVec3, normalizeVec3, subVec3, type Vec3 } from ".";

export function offsetPolygon3D(
  vertices: DeepReadonly<Vec3[]>,
  offset: number,
): DeepReadonly<Vec3[]> {
  if (vertices.length < 3) return vertices;

  const v0 = vertices[0]!;
  const v1 = vertices[1]!;
  const v2 = vertices[2]!;

  const normal = normalizeVec3(crossVec3(subVec3(v1, v0), subVec3(v2, v0)));

  const result: Vec3[] = [];

  for (let i = 0; i < vertices.length; i++) {
    const prev = vertices.at(i - 1)!;
    const curr = vertices[i]!;
    const next = vertices[(i + 1) % vertices.length]!;

    const prevDir = normalizeVec3(subVec3(curr, prev));
    const nextDir = normalizeVec3(subVec3(next, curr));

    // 面内で内側を向く法線
    const prevInward = normalizeVec3(crossVec3(normal, prevDir));
    const nextInward = normalizeVec3(crossVec3(normal, nextDir));

    // 二等分方向
    const moveDir = normalizeVec3(addVec3(prevInward, nextInward));

    // オフセット距離補正
    const cos = dotVec3(moveDir, prevInward);

    result.push(addVec3(curr, mulVec3(moveDir, offset / cos)));
  }

  return result;
}
