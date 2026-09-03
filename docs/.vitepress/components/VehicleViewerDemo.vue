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
import ViewerCanvas from "./ViewerCanvas.vue";

const props = defineProps<{
  defaultVehicle?: string;
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

const defaultDisabled = ref<boolean>(false);
const vehicleData = ref<Vehicle | null>(null);
const vehicleObject = ref<THREE.Object3D | null>(null);
const options = ref<VehicleBodyBuildOptions>({
  edge: true,
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
    if (defaultDisabled.value || !xml) return;
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
</script>

<template>
  <div class="viewer-demo">
    <ViewerCanvas class="viewer-canvas" :objects="vehicleObject ? [vehicleObject] : []" />
    <BuildOptions class="build-options" v-model="options" />
  </div>
</template>

<style lang="css" scoped>
.viewer-demo {
  width: 100%;
  margin: 16px 0;
}

.viewer-canvas {
  height: 400px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
}
</style>
