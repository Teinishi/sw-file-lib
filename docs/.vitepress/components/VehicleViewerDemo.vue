<script setup lang="ts">
import * as THREE from "three";
import { ref, watch, markRaw } from "vue";
import { VehicleBodyAssembler, type VehicleAssetResolver } from "@sw-file-lib/three";
import { safeParseVehicleXml } from "@sw-file-lib/xml";
import { BASIC_BLOCK_SURFACE_DEFINITIONS, isBasicBlockType } from "../basicBlocks";
import ViewerCanvas from "./ViewerCanvas.vue";

const props = defineProps<{
  defaultVehicle?: string;
}>();

let defaultDisabled = false;
let vehicleObject = ref<THREE.Group | null>(null);

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

async function loadVehicle(xml: string) {
  const result = safeParseVehicleXml(xml);
  if (!result.success) {
    console.error(result.error);
    alert("Failed to parse vehicle XML.");
    return;
  }

  const vehicle = result.data;

  const group = new THREE.Group();
  for (const body of vehicle.bodies ?? []) {
    const assembler = new VehicleBodyAssembler(assetResolver);

    for (const component of body.components ?? []) {
      await assembler.appendComponent(component);
    }

    const obj = assembler.build();
    group.add(obj);
  }
  vehicleObject.value = markRaw(group);
}

watch(
  () => props.defaultVehicle,
  async (xml) => {
    if (defaultDisabled || !xml) return;
    await loadVehicle(xml);
  },
  { immediate: true },
);
</script>

<template>
  <ViewerCanvas class="viewer" :objects="vehicleObject ? [vehicleObject] : []" />
</template>

<style lang="css" scoped>
.viewer {
  width: 100%;
  height: 400px;
  border-radius: 8px;
  overflow: hidden;
  margin: 16px 0;
}
</style>
