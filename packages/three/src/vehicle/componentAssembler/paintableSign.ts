import * as THREE from "three";
import { parseColor, type Color } from "@sw-file-lib/core/color";
import type { ComponentDefinitionImmutable, VehicleSchemas } from "@sw-file-lib/xml";
import {
  createAdditiveMaterial,
  createAdditiveUniforms,
  createOpaqueMaterial,
  createOpaqueUniforms,
} from "../..";
import { ADDITIVE_LUT } from "./additiveLut";

export async function assemblePaintableSign(
  definition: ComponentDefinitionImmutable,
  component: VehicleSchemas.ComponentImmutable,
) {
  const isNoAdditive = (((definition.flags ?? 0) >> 22) & 1) !== 0;

  let paintableSurface = false;
  const surfaces = definition.surfaces?.map((surface) => {
    if (
      surface.orientation === 2 &&
      (surface.position?.x ?? 0) === 0 &&
      (surface.position?.y ?? 0) === 0 &&
      (surface.position?.z ?? 0) === 0
    ) {
      paintableSurface = true;
      return {
        ...surface,
        shape: 0,
      };
    }
    return surface;
  });

  if (!paintableSurface) {
    return surfaces ? { surfaces } : {};
  }

  const objects: Record<string, THREE.Mesh> = {};

  const gc = component.o?.gc?.split(",").map((c) => parseColor(c)) ?? [];
  const geom1 = createPixelGeometry(gc, 0.125);
  const opaqueMaterial = createOpaqueMaterial(
    createOpaqueUniforms({ overrideColorEnabled: false }),
  );
  objects.sign = new THREE.Mesh(geom1, opaqueMaterial);

  if (!isNoAdditive) {
    const gca = component.o?.gca?.split(",").map((c) => parseColor(c)) ?? [];
    const geom2 = createPixelGeometry(gca, 0.125, true);
    const additiveMaterial = createAdditiveMaterial(
      createAdditiveUniforms({ overrideColorEnabled: false }),
    );
    objects.sign_additive = new THREE.Mesh(geom2, additiveMaterial);
  }

  return {
    ...(surfaces ? { surfaces } : {}),
    objects,
  };
}

function createPixelGeometry(
  data: (Color | undefined)[],
  y = 0,
  isAdditive = false,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  for (let z = 0; z < 9; z++) {
    for (let x = 0; x < 9; x++) {
      const intColor = data[z * 9 + x] ?? { r: 255, g: 255, b: 255 };

      const x1 = 0.25 * (x / 9) - 0.125;
      const x2 = 0.25 * ((x + 1) / 9) - 0.125;
      const z1 = -0.25 * (z / 9) + 0.125;
      const z2 = -0.25 * ((z + 1) / 9) + 0.125;

      positions.push(x1, y, z1);
      positions.push(x2, y, z1);
      positions.push(x2, y, z2);
      positions.push(x1, y, z2);

      for (let i = 0; i < 4; i++) {
        normals.push(0, 1, 0);
        colors.push(
          convertSignColor(intColor.r, isAdditive),
          convertSignColor(intColor.g, isAdditive),
          convertSignColor(intColor.b, isAdditive),
        );
      }

      const i0 = (z * 9 + x) * 4;
      const i1 = i0 + 1;
      const i2 = i0 + 2;
      const i3 = i0 + 3;

      indices.push(i0, i1, i2);
      indices.push(i0, i2, i3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  return geometry;
}

function convertSignColor(value: number, isAdditive: boolean) {
  value = Math.min(Math.max(Math.round(value), 0), 255);
  if (isAdditive) {
    return Math.pow((ADDITIVE_LUT[value] ?? 0) / 255, 2.2);
  } else {
    return value / 255;
  }
}
