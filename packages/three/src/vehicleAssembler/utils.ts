import * as THREE from "three";
import { parseColor } from "@sw-file-lib/core/color";
import type { VehicleSchemas } from "@sw-file-lib/xml";
import { createSwMaterials } from "..";

export const ADDITIVE_LUT = new Uint8Array([
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  13, 25, 35, 47, 57, 66, 75, 85, 93, 99, 106, 113, 119, 126, 130, 136, 141, 145, 150, 154, 158,
  161, 164, 168, 171, 174, 177, 179, 182, 184, 186, 188, 191, 193, 194, 196, 198, 200, 201, 202,
  203, 204, 207, 208, 209, 210, 211, 211, 212, 214, 215, 216, 217, 217, 218, 219, 219, 220, 220,
  222, 223, 223, 224, 224, 225, 225, 226, 226, 227, 227, 228, 228, 228, 230, 230, 230, 231, 231,
  231, 232, 232, 232, 233, 233, 233, 234, 234, 234, 234, 235, 235, 235, 235, 236, 236, 236, 236,
  236, 238, 238, 238, 238, 238, 239, 239, 239, 239, 239, 240, 240, 240, 240, 240, 240, 240, 241,
  241, 241, 241, 241, 241, 241, 242, 242, 242, 242, 242, 242, 242, 242, 243, 243, 243, 243, 243,
  243, 243, 243, 243, 244, 244, 244, 244, 244, 244, 244, 244, 244, 244, 244, 244, 246, 246, 246,
  246, 246, 246, 246, 246, 246, 246, 246, 246, 246, 247, 247, 247, 247, 247, 247, 247, 247, 247,
  247, 247, 247, 247, 247, 247, 247, 248, 248, 248, 248, 248, 248, 248, 248, 248, 248, 248, 248,
  248, 248, 248, 248, 248, 248, 248, 248, 249, 249, 249, 249, 249, 249, 249, 249, 249, 249, 249,
  249, 249, 249, 249, 249, 249, 249, 249, 249, 249, 249, 249,
]);

export function createMaterialsForComponent(component: VehicleSchemas.ComponentImmutable) {
  const materials = createSwMaterials();

  const bc = component.o?.bc ? parseColor(component.o.bc) : undefined;
  const bc2 = component.o?.bc2 ? parseColor(component.o.bc2) : bc;
  const bc3 = component.o?.bc3 ? parseColor(component.o.bc3) : bc;
  if (bc) materials.uniforms.opaque.set("overrideColor1", bc);
  if (bc2) materials.uniforms.opaque.set("overrideColor2", bc2);
  if (bc3) materials.uniforms.opaque.set("overrideColor3", bc3);
  materials.uniforms.opaque.set("overrideColorEnabled", true);

  const ac = component.o?.ac ? parseColor(component.o.ac) : undefined;
  if (ac) materials.uniforms.additive.set("overrideColor", ac);
  materials.uniforms.additive.set("overrideColorEnabled", true);

  const materialArr = [materials.opaque, materials.glass, materials.additive];

  return { materials, materialArr };
}

export function combineGeometries(
  geometries: (THREE.BufferGeometry | undefined)[],
  material: THREE.Material | THREE.Material[],
): THREE.Group {
  const group = new THREE.Group();
  for (const geometry of geometries) {
    if (geometry) {
      group.add(new THREE.Mesh(geometry, material));
    }
  }
  return group;
}
