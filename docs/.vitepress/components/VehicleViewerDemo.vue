<script setup lang="ts">
import ViewerCanvas from "./ViewerCanvas.vue";
</script>

<template>
  <ViewerCanvas class="viewer" :objects="[]" />
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
