<script setup lang="ts">
import type { VehicleBodyBuildOptions } from "@sw-file-lib/three";

const props = defineProps<{
  modelValue: VehicleBodyBuildOptions;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: VehicleBodyBuildOptions];
}>();
</script>

<template>
  <fieldset class="vehicle-options">
    <legend>Build Options</legend>

    <label class="option">
      <input v-model="modelValue.edge" type="checkbox" />
      <div>
        <div class="title">edges</div>
        <div class="description">Generates border geometry for surfaces.</div>
      </div>
    </label>

    <label class="option">
      <input v-model="modelValue.hollow" type="checkbox" />
      <div>
        <div class="title">hollow</div>
        <div class="description">Generates only surface borders. Automatically enables edges.</div>
      </div>
    </label>

    <label class="option">
      <input v-model="modelValue.cull" type="checkbox" />
      <div>
        <div class="title">cull</div>
        <div class="description">Removes internal surfaces before generating geometry.</div>
      </div>
    </label>
  </fieldset>
</template>

<style scoped>
.vehicle-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  padding: 1rem;
  border: 1px solid var(--vp-c-divider, #dcdcdc);
  border-radius: 8px;
  margin: 0;
}

.vehicle-options legend {
  padding: 0 0.5rem;
  font-weight: 600;
}

.option {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
}

.option input {
  margin-top: 0.4rem;
}

.title {
  font-weight: 500;
}

.description {
  margin-top: 0.15rem;
  font-size: 0.875rem;
  color: var(--vp-c-text-2, #666);
}
</style>
