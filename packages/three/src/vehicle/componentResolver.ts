import * as THREE from "three";
import { parseMesh } from "@sw-file-lib/core";
import { parseColor, type Color } from "@sw-file-lib/core/color";
import {
  safeParseComponentDefinitionXml,
  VehicleSchemas,
  type ComponentDefinition,
} from "@sw-file-lib/xml";
import { applyUniformPatch, createSwMaterials, createSwMeshGeometry } from "..";
import type { ComponentResolver, ResolvedComponent } from "./assembleGeometry";

export function createComponentResolver(
  getComponentDefinitionXml: (componentName: string) => Promise<string | undefined>,
  getMesh: (meshName: string) => Promise<ArrayBuffer | undefined>,
): ComponentResolver {
  const componentCache: Map<string, ComponentDefinition | null> = new Map();
  const meshCache: Map<string, THREE.BufferGeometry | null> = new Map();

  async function getComponentDefinitionCached(
    componentName: string,
  ): Promise<ComponentDefinition | undefined> {
    let definition = componentCache.get(componentName);
    if (definition === null) return;
    if (definition === undefined) {
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

      definition = parseResult.data;
      componentCache.set(componentName, definition);
    }
    return definition;
  }

  async function getMeshGeometryCached(
    meshName: string,
  ): Promise<THREE.BufferGeometry | undefined> {
    let mesh = meshCache.get(meshName);
    if (mesh === null) return;
    if (mesh === undefined) {
      const buf = await getMesh(meshName);
      if (!buf) {
        // onMeshNotFound
        meshCache.set(meshName, null);
        return;
      }

      let mesh;
      try {
        mesh = parseMesh(buf);
      } catch {
        // onMeshParseError
        meshCache.set(meshName, null);
        return;
      }

      const geometry = createSwMeshGeometry(mesh);

      meshCache.set(meshName, geometry);
      return geometry;
    }
  }

  async function resolve(componentName: string): Promise<ResolvedComponent | undefined> {
    const definition = await getComponentDefinitionCached(componentName);
    if (!definition) return;

    let meshGeometry: THREE.BufferGeometry | undefined;
    let mesh0Geometry: THREE.BufferGeometry | undefined;
    let mesh1Geometry: THREE.BufferGeometry | undefined;
    let mesh2Geometry: THREE.BufferGeometry | undefined;
    if (definition.mesh_data_name) {
      meshGeometry = await getMeshGeometryCached(definition.mesh_data_name);
    }
    if (definition.mesh_0_name) {
      mesh0Geometry = await getMeshGeometryCached(definition.mesh_0_name);
    }
    if (definition.mesh_1_name) {
      mesh1Geometry = await getMeshGeometryCached(definition.mesh_1_name);
    }
    if (definition.mesh_2_name) {
      mesh2Geometry = await getMeshGeometryCached(definition.mesh_2_name);
    }

    const meshFactory = (component: VehicleSchemas.ComponentImmutable) => {
      if (!meshGeometry && !mesh0Geometry && !mesh1Geometry && !mesh2Geometry) {
        return undefined;
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
    };

    return { definition, meshFactory };
  }

  return resolve;
}

function colorToVec4(color: Color | undefined): [number, number, number, number] {
  return [
    (color?.r ?? 255) / 255,
    (color?.g ?? 255) / 255,
    (color?.b ?? 255) / 255,
    (color?.a ?? 255) / 255,
  ];
}
