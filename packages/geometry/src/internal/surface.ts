import type { DeepReadonly } from "ts-essentials";
import { modulo } from "@sw-file-lib/internal-utils";
import { type ShapeEdgeCoverage } from "..";

export function compareCoverage(
  a: DeepReadonly<ShapeEdgeCoverage>,
  b: DeepReadonly<ShapeEdgeCoverage>,
  start: number = 0,
  flip: boolean = false,
) {
  let na = 0;
  let nb = 0;

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const k = 4 * i + j;

      na |= (a[i]![j]! ? 1 : 0) << k;

      if (flip) {
        nb |= (b[modulo(start - i - 1, 4)]![3 - j]! ? 1 : 0) << k;
      } else {
        nb |= (b[modulo(start + i, 4)]![j]! ? 1 : 0) << k;
      }
    }
  }

  return {
    isACovered: (na | nb) === nb,
    isBCovered: (na | nb) === na,
  };
}
