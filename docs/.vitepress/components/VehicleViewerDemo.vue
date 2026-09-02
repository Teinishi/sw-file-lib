<script setup lang="ts">
import * as THREE from "three";
import { ref, watch, markRaw } from "vue";
import { createVehicleAssetResolver, VehicleBodyAssembler } from "@sw-file-lib/three";
import { safeParseVehicleXml } from "@sw-file-lib/xml";
import ViewerCanvas from "./ViewerCanvas.vue";

const componentDefinitionFiles = import.meta.glob("./rom/data/definitions/*.xml", {
  query: "?raw",
  import: "default",
  eager: true,
});

const props = defineProps<{
  defaultVehicle?: string;
}>();

let defaultDisabled = false;
let vehicleObject = ref<THREE.Group | null>(null);

const assetResolver = createVehicleAssetResolver(
  (componentId) => {
    const file = componentDefinitionFiles[`./rom/data/definitions/${componentId}.xml`];
    return file ? file : undefined;
  },
  (_meshPath) => undefined,
);

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
