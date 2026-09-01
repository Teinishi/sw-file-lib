<script setup lang="ts">
import * as THREE from "three";
import { computed, markRaw, reactive, ref } from "vue";
import { serializeMesh, parseMeshOrPhys, type MeshData } from "@sw-file-lib/core";
import { GeometryBuilder } from "@sw-file-lib/geometry";
import {
  createSwMesh,
  createSwPhysMeshGroup,
  createVehicleAssetResolver,
  VehicleBodyAssembler,
} from "@sw-file-lib/three";
import { VehicleSchema } from "@sw-file-lib/xml";
import ViewerCanvas from "./components/ViewerCanvas.vue";

const COLORS = [0x0f766e, 0x1d4ed8, 0x7c3aed, 0xb45309, 0xdc2626, 0x059669, 0xc026d3, 0x0284c7];
let nextColorIndex = 0;
function getColor() {
  const color = COLORS[nextColorIndex]!;
  nextColorIndex = (nextColorIndex + 1) % COLORS.length;
  return color;
}

type LoadedObject = {
  id: number;
  name: string;
  kind: "mesh" | "phys" | "vehicle";
  object: THREE.Object3D;
  meshData: MeshData | null;
  visible: boolean;
};

const loadedObjects = reactive<LoadedObject[]>([]);
const isDragging = ref(false);
const errorMessage = ref("");
const fileInput = ref<HTMLInputElement>();
const physMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });

let nextObjectId = 1;
let dragDepth = 0;

const sceneObjects = computed(() => loadedObjects.map((item) => item.object));

function loadMesh(bytes: ArrayBuffer, name: string) {
  const data = parseMeshOrPhys(bytes);
  const mainObject =
    data.kind === "mesh"
      ? createSwMesh(data, { name })
      : createSwPhysMeshGroup(data, physMaterial, { name });

  const object = new THREE.Group();
  object.add(mainObject);

  // group のワイヤーフレーム表示
  if (data.kind === "mesh") {
    for (const group of data.groups) {
      const { boundsMin, boundsMax } = group;
      const geometry = new THREE.BoxGeometry(
        boundsMax.x - boundsMin.x,
        boundsMax.y - boundsMin.y,
        boundsMax.z - boundsMin.z,
      );
      const material = new THREE.MeshBasicMaterial({ color: getColor(), wireframe: true });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (boundsMin.x + boundsMax.x) / 2,
        (boundsMin.y + boundsMax.y) / 2,
        -(boundsMin.z + boundsMax.z) / 2,
      );
      object.add(mesh);
    }
  }

  loadedObjects.push({
    id: nextObjectId++,
    name,
    kind: data.kind,
    object: markRaw(object),
    meshData: null,
    visible: true,
  });
}

function getRomPath(base: string, path: string): string {
  const parts = path.split("/");

  for (const part of parts) {
    if (!/^[A-Za-z0-9._-]+$/.test(part)) {
      throw new Error(`Invalid ROM path: ${path}`);
    }
  }

  return `${base}/${path}`;
}

const assetResolver = createVehicleAssetResolver(
  (componentId) =>
    fetch(getRomPath("/rom/data/definitions", componentId + ".xml")).then(async (res) => {
      if (!res.ok) return undefined;
      return await res.text();
    }),
  (meshPath) =>
    fetch(getRomPath("/rom", meshPath)).then(async (res) => {
      if (!res.ok) return undefined;
      return await res.arrayBuffer();
    }),
);

async function loadVehicle(text: string, name: string) {
  const vehicle = VehicleSchema.parse(text, "vehicle");

  const vehicleGroup = new THREE.Group();
  vehicleGroup.name = name;

  const builder = new GeometryBuilder();

  for (const body of vehicle.bodies ?? []) {
    const assembler = new VehicleBodyAssembler(assetResolver);
    for (const component of body.components ?? []) {
      await assembler.appendComponent(component);
    }

    const obj = assembler.build();
    vehicleGroup.add(obj);

    builder.merge(assembler.buildSurfaceMesh());
  }

  loadedObjects.push({
    id: nextObjectId++,
    name,
    kind: "vehicle",
    object: markRaw(vehicleGroup),
    meshData: markRaw(builder.toMeshData()),
    visible: true,
  });
}

async function addFiles(fileList: FileList | File[]) {
  errorMessage.value = "";
  const files = [...fileList].filter((file) => /\.(mesh|phys|xml)$/i.test(file.name));

  if (files.length === 0) {
    errorMessage.value = "Please drop .mesh, .phys, or .xml files.";
    return;
  }

  for (const file of files) {
    try {
      if (file.name.endsWith(".xml")) {
        await loadVehicle(await file.text(), file.name);
      } else {
        loadMesh(await file.arrayBuffer(), file.name);
      }
    } catch (error) {
      errorMessage.value = `Failed to load ${file.name}: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  }
}

function setVisible(item: LoadedObject, visible: boolean) {
  item.visible = visible;
  item.object.visible = visible;
}

function openFileDialog() {
  fileInput.value?.click();
}

function onFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;

  if (input.files) {
    void addFiles(input.files);
  }

  input.value = "";
}

function saveObject(item: LoadedObject) {
  if (!item.meshData) return;
  const bytes = serializeMesh(item.meshData);
  const blob = new Blob([bytes], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${item.name}.mesh`;
  link.click();
}

function removeObject(item: LoadedObject) {
  const index = loadedObjects.findIndex((loadedObject) => loadedObject.id === item.id);
  if (index >= 0) {
    loadedObjects.splice(index, 1);
  }
}

function clearObjects() {
  loadedObjects.splice(0);
}

function onDragEnter(event: DragEvent) {
  event.preventDefault();
  dragDepth++;
  isDragging.value = true;
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
}

function onDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1);
  isDragging.value = dragDepth > 0;
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  dragDepth = 0;
  isDragging.value = false;

  if (event.dataTransfer?.files) {
    void addFiles(event.dataTransfer.files);
  }
}
</script>

<template>
  <main
    class="dev-viewer"
    :class="{ 'is-dragging': isDragging }"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <ViewerCanvas class="canvas" :objects="sceneObjects" />

    <aside class="object-panel">
      <h1>Stormworks Three.js Integration Demo</h1>

      <input
        ref="fileInput"
        class="file-input"
        type="file"
        accept=".mesh,.phys,.xml"
        multiple
        @change="onFileSelect"
      />

      <div class="actions">
        <button type="button" @click="openFileDialog">Select File</button>
        <button type="button" :disabled="loadedObjects.length === 0" @click="clearObjects">
          Clear
        </button>
      </div>

      <div class="drop-zone">
        <span>D&D</span>
        <p>.mesh / .phys / .xml</p>
      </div>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <ul v-if="loadedObjects.length > 0" class="object-list">
        <li v-for="item in loadedObjects" :key="item.id" class="object-item">
          <label class="visibility-control">
            <input
              type="checkbox"
              :checked="item.visible"
              @change="setVisible(item, ($event.target as HTMLInputElement).checked)"
            />
            <span class="object-name">{{ item.name }}</span>
            <span class="object-kind">{{ item.kind }}</span>
          </label>
          <button
            class="save-button"
            type="button"
            :aria-label="`Save ${item.name}`"
            @click="saveObject(item)"
            :disabled="item.meshData === null"
          >
            Save
          </button>
          <button
            class="delete-button"
            type="button"
            :aria-label="`Remove ${item.name}`"
            @click="removeObject(item)"
          >
            Remove
          </button>
        </li>
      </ul>
    </aside>
  </main>
</template>

<style scoped>
.dev-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  background: #20242a;
}

.canvas {
  width: 100%;
  height: 100%;
}

.dev-viewer::after {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  content: "";
  border: 2px solid transparent;
  transition:
    border-color 120ms ease,
    background-color 120ms ease;
}

.dev-viewer.is-dragging::after {
  background: rgba(82, 144, 210, 0.16);
  border-color: #78b7ff;
}

.object-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(320px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  padding: 14px;
  overflow: hidden;
  color: #f2f5f8;
  background: rgba(31, 35, 41, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(12px);
}

.object-panel h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.file-input {
  display: none;
}

.actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.actions button,
.delete-button,
.save-button {
  min-height: 32px;
  padding: 0 10px;
  color: #f2f5f8;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 6px;
}

.actions button:hover:not(:disabled),
.delete-button:hover {
  background: rgba(255, 255, 255, 0.16);
}

.actions button:disabled {
  color: #788390;
  cursor: default;
  background: rgba(255, 255, 255, 0.05);
}

.drop-zone {
  display: grid;
  gap: 4px;
  padding: 14px;
  color: #c8d2dd;
  border: 1px dashed rgba(255, 255, 255, 0.3);
  border-radius: 8px;
}

.drop-zone span {
  font-size: 13px;
  font-weight: 700;
  color: #f2f5f8;
}

.drop-zone p,
.empty,
.error {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}

.error {
  color: #ffb3ad;
}

.object-list {
  display: grid;
  gap: 6px;
  padding: 0;
  margin: 0;
  overflow: auto;
  list-style: none;
}

.object-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
  align-items: center;
  padding: 7px 8px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
}

.visibility-control {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-width: 0;
  min-height: 34px;
}

.object-item input {
  width: 16px;
  height: 16px;
  margin: 0;
}

.object-name {
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.object-kind {
  padding: 2px 6px;
  font-size: 11px;
  color: #aeb9c5;
  text-transform: uppercase;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.delete-button,
.save-button {
  min-height: 28px;
  padding: 0 8px;
  font-size: 12px;
}

.empty {
  color: #aeb9c5;
}
</style>
