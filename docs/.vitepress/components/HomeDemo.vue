<script setup lang="ts">
import sampleVehicle from "../../data/sample_vehicle.xml?raw";
import VehicleViewerDemo from "./VehicleViewerDemo.vue";
</script>

<template>
  <div class="home-demo">
    <VehicleViewerDemo :default-vehicle="sampleVehicle" :show-options="false" height="600px" />
  </div>
</template>

<style scoped>
.home-demo {
  margin-top: 64px;
}
</style>
