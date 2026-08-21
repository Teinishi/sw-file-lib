import {
  addVec3,
  detMat3,
  mulMat3,
  mulMat3Vec3,
  partialToFullVec3,
} from "@sw-file-lib/internal-utils";
import {
  isValidSurfaceOrientation,
  isValidSurfaceRotation,
  isValidSurfaceShape,
  type ComponentSurfaceData,
  type SurfaceData,
} from ".";
import { getSurfaceOrientation } from "../internal/surface";

export function normalizeSurfaceData(components: ComponentSurfaceData[]): SurfaceData[] {
  const result: SurfaceData[] = [];

  for (const component of components) {
    const cPos = partialToFullVec3(component.position);
    const cMat = component.matrix;

    for (const surface of component.surfaces) {
      const orientation = surface.orientation ?? 0;
      const rotation = surface.rotation ?? 0;
      const shape = surface.shape ?? 0;

      if (!isValidSurfaceOrientation(orientation)) continue;
      if (!isValidSurfaceRotation(rotation)) continue;
      if (!isValidSurfaceShape(shape)) continue;

      const lPos = partialToFullVec3(surface.position);
      const position = addVec3(cMat ? mulMat3Vec3(cMat, lPos) : lPos, cPos);

      let matrix = getSurfaceOrientation(orientation, rotation).toMat3();
      if (cMat) matrix = mulMat3(cMat, matrix);

      const item: SurfaceData = {
        componentPosition: component.position,
        componentMatrix: component.matrix,
        localPosition: surface.position,
        position,
        matrix,
        isFlipped: detMat3(matrix) < 0,
        shape,
        orientation,
        rotation,
      };

      if (surface.color) item.color = surface.color;

      result.push(item);
    }
  }

  return result;
}
