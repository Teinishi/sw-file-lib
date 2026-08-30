import * as THREE from "three";
import { parseMesh } from "@sw-file-lib/core";
import { parseColor, type Color } from "@sw-file-lib/core/color";
import {
  safeParseComponentDefinitionXml,
  VehicleSchemas,
  type ComponentDefinition,
} from "@sw-file-lib/xml";
import { applyUniformPatch, createSwMaterials, createSwMeshGeometry } from "..";
import type { ComponentAssembler } from "./assembleGeometry";

export function createComponentAssembler(
  getComponentDefinitionXml: (componentName: string) => Promise<string | undefined>,
  getMesh: (meshName: string) => Promise<ArrayBuffer | undefined>,
): ComponentAssembler {
  const componentCache: Map<string, ComponentDefinition | null> = new Map();
  const meshCache: Map<string, THREE.BufferGeometry | null> = new Map();

  async function getComponentDefinitionCached(
    componentName: string,
  ): Promise<ComponentDefinition | undefined> {
    let cacheHit = componentCache.get(componentName);
    if (cacheHit) return cacheHit;
    if (cacheHit === null) return;

    const definitionXml = await getComponentDefinitionXml(componentName);
    if (!definitionXml) {
      // onComponentNotFound
      componentCache.set(componentName, null);
      return;
    }

    const parseResult = safeParseComponentDefinitionXml(definitionXml);
    if (!parseResult.success) {
      // onComponentParseError
      componentCache.set(componentName, null);
      return;
    }

    const definition = parseResult.data;
    componentCache.set(componentName, definition);
    return definition;
  }

  async function getMeshGeometryCached(
    meshName: string,
  ): Promise<THREE.BufferGeometry | undefined> {
    let cacheHit = meshCache.get(meshName);
    if (cacheHit) return cacheHit;
    if (cacheHit === null) return;

    const buf = await getMesh(meshName);
    if (!buf) {
      // onMeshNotFound
      meshCache.set(meshName, null);
      return;
    }

    let meshData;
    try {
      meshData = parseMesh(buf);
    } catch {
      // onMeshParseError
      meshCache.set(meshName, null);
      return;
    }

    const geometry = createSwMeshGeometry(meshData);
    meshCache.set(meshName, geometry);
    return geometry;
  }

  return async (component, _bodyIndex, _componentIndex) => {
    const componentName = component.d ?? "01_block";

    const definition = await getComponentDefinitionCached(componentName);
    if (!definition) return;

    const { surfaces, mesh_data_name, mesh_0_name, mesh_1_name, mesh_2_name } = definition;

    const objects = createMeshObjects(
      component,
      mesh_data_name ? await getMeshGeometryCached(mesh_data_name) : undefined,
      mesh_0_name ? await getMeshGeometryCached(mesh_0_name) : undefined,
      mesh_1_name ? await getMeshGeometryCached(mesh_1_name) : undefined,
      mesh_2_name ? await getMeshGeometryCached(mesh_2_name) : undefined,
    );

    return {
      ...(surfaces ? { surfaces } : {}),
      ...(objects ? { objects } : {}),
    };
  };
}

function createMeshObjects(
  component: VehicleSchemas.ComponentImmutable,
  meshGeometry: THREE.BufferGeometry | undefined,
  mesh0Geometry: THREE.BufferGeometry | undefined,
  mesh1Geometry: THREE.BufferGeometry | undefined,
  mesh2Geometry: THREE.BufferGeometry | undefined,
): Record<string, THREE.Mesh> | undefined {
  if (!meshGeometry && !mesh0Geometry && !mesh1Geometry && !mesh2Geometry) {
    return;
  }

  const materials = createSwMaterials();

  const bc = component.o?.bc ? parseColor(component.o.bc) : undefined;
  const bc2 = component.o?.bc2 ? parseColor(component.o.bc2) : bc;
  const bc3 = component.o?.bc3 ? parseColor(component.o.bc3) : bc;
  applyUniformPatch(materials.uniforms.opaque, {
    blockColor1: { type: "vec4", value: colorToVec4(bc) },
    blockColor2: { type: "vec4", value: colorToVec4(bc2) },
    blockColor3: { type: "vec4", value: colorToVec4(bc3) },
    overrideColor: { type: "int", value: 1 },
  });

  const ac = component.o?.ac ? parseColor(component.o.ac) : { r: 255, g: 255, b: 255 };
  if (ac) {
    materials.additive.vertexColors = false;
    materials.additive.color = new THREE.Color(ac.r / 255, ac.g / 255, ac.b / 255);
  }

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

function colorToVec4(color: Color | undefined): [number, number, number, number] {
  return [
    (color?.r ?? 255) / 255,
    (color?.g ?? 255) / 255,
    (color?.b ?? 255) / 255,
    (color?.a ?? 255) / 255,
  ];
}
