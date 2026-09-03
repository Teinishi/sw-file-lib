<script setup lang="ts">
import * as THREE from "three";
import { ref, watch, markRaw } from "vue";
import {
  VehicleBodyAssembler,
  type VehicleAssetResolver,
  type VehicleBodyBuildOptions,
} from "@sw-file-lib/three";
import { safeParseVehicleXml, type Vehicle } from "@sw-file-lib/xml";
import { BASIC_BLOCK_SURFACE_DEFINITIONS, isBasicBlockType } from "../basicBlocks";
import BuildOptions from "./BuildOptions.vue";
import FileDropZone from "./FileDropZone.vue";
import ViewerCanvas from "./ViewerCanvas.vue";

const props = defineProps<{
  defaultVehicle?: string;
  showOptions?: boolean;
  height: string;
}>();

const assetResolver: VehicleAssetResolver = {
  async resolveComponentDefinition(componentId) {
    componentId ??= "01_block";
    if (isBasicBlockType(componentId)) {
      return { surfaces: BASIC_BLOCK_SURFACE_DEFINITIONS[componentId] };
    }
  },
  async resolveMesh(_meshPath) {
    return undefined;
  },
};

const vehicleData = ref<Vehicle | null>(null);
const vehicleObject = ref<THREE.Object3D | null>(null);
const options = ref<VehicleBodyBuildOptions>({
  edge: false,
  hollow: false,
  cull: true,
});

async function update() {
  if (!vehicleData.value) {
    vehicleObject.value = null;
    return;
  }

  const group = new THREE.Group();
  for (const body of vehicleData.value.bodies ?? []) {
    const assembler = new VehicleBodyAssembler(assetResolver);

    for (const component of body.components ?? []) {
      await assembler.appendComponent(component);
    }

    const obj = assembler.build(options.value);
    group.add(obj);
  }

  vehicleObject.value = markRaw(group);
}

watch(vehicleData, update);
watch(options, update, { deep: true });

watch(
  () => props.defaultVehicle,
  async (xml) => {
    if (!xml) return;
    await loadVehicle(xml);
  },
  { immediate: true },
);

async function loadVehicle(xml: string) {
  const result = safeParseVehicleXml(xml);
  if (!result.success) {
    console.error(result.error);
    alert("Failed to parse vehicle XML.");
    return;
  }

  vehicleData.value = result.data;
}

async function selectFile(files: File[]) {
  if (files.length === 0) return;
  const file = files[0];
  if (!file) return;
  await loadVehicle(await file.text());
}
</script>

<template>
  <div class="viewer-demo">
    <ViewerCanvas
      class="viewer-canvas"
      :style="{ height }"
      :objects="vehicleObject ? [vehicleObject] : []"
    />
    <FileDropZone label="Drop vehicle XML files" accept=".xml" @select="selectFile" />
    <BuildOptions v-if="props.showOptions" class="build-options" v-model="options" />
  </div>
</template>

<style lang="css" scoped>
.viewer-demo {
  width: 100%;
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.viewer-canvas {
  border-radius: 8px;
  overflow: hidden;
}
</style>
