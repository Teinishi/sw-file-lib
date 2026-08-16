<script setup lang="ts">
import { createSwMaterials } from "@sw-file-lib/three";

const materials = createSwMaterials();
</script>

<template>
  <div>{{ Object.keys(materials) }}</div>
</template>
