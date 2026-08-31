import * as THREE from "three";
import { parseColor } from "@sw-file-lib/core/color";
import type { VehicleSchemas } from "@sw-file-lib/xml";
import { createSwMaterials, type SwMaterialSet } from "../..";

export function createMeshObjects(
  component: VehicleSchemas.ComponentImmutable,
  meshGeometry: THREE.BufferGeometry | undefined,
  mesh0Geometry: THREE.BufferGeometry | undefined,
  mesh1Geometry: THREE.BufferGeometry | undefined,
  mesh2Geometry: THREE.BufferGeometry | undefined,
): Record<string, THREE.Mesh> | undefined {
  if (!meshGeometry && !mesh0Geometry && !mesh1Geometry && !mesh2Geometry) {
    return;
  }

  const materials = createComponentMaterials(component);
  const materialArr = [materials.opaque, materials.glass, materials.additive];

  const meshes: Record<string, THREE.Mesh> = {};
  if (meshGeometry) {
    meshes.mesh = new THREE.Mesh(meshGeometry, materialArr);
  }
  if (mesh0Geometry) {
    meshes.mesh0 = new THREE.Mesh(mesh0Geometry, materialArr);
  }
  if (mesh1Geometry) {
    meshes.mesh1 = new THREE.Mesh(mesh1Geometry, materialArr);
  }
  if (mesh2Geometry) {
    meshes.mesh2 = new THREE.Mesh(mesh2Geometry, materialArr);
  }

  return meshes;
}

export function createComponentMaterials(
  component: VehicleSchemas.ComponentImmutable,
): SwMaterialSet {
  const materials = createSwMaterials();

  const bc = component.o?.bc ? parseColor(component.o.bc) : undefined;
  const bc2 = component.o?.bc2 ? parseColor(component.o.bc2) : bc;
  const bc3 = component.o?.bc3 ? parseColor(component.o.bc3) : bc;
  if (bc) materials.uniforms.opaque.setOverrideColor1(bc);
  if (bc2) materials.uniforms.opaque.setOverrideColor2(bc2);
  if (bc3) materials.uniforms.opaque.setOverrideColor3(bc3);
  materials.uniforms.opaque.setOverrideColorEnabled(true);

  const ac = component.o?.ac ? parseColor(component.o.ac) : undefined;
  if (ac) materials.uniforms.additive.setOverrideColor(ac);
  materials.uniforms.additive.setOverrideColorEnabled(true);

  return materials;
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
