<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  accept?: string;
  multiple?: boolean;
  label?: string;
}>();

const emit = defineEmits<{
  (e: "select", files: File[]): void;
}>();

const input = ref<HTMLInputElement>();
const dragging = ref(false);
const dragDepth = ref(0);

const emitFiles = (files: FileList | null) => {
  if (!files) return;
  emit("select", [...files]);
  if (input.value) input.value.value = "";
};

const onChange = (e: Event) => emitFiles((e.target as HTMLInputElement).files);

function onDragEnter(e: DragEvent) {
  e.preventDefault();
  dragDepth.value++;
  dragging.value = true;
}

function onDragLeave(e: DragEvent) {
  e.preventDefault();
  dragDepth.value--;

  if (dragDepth.value === 0) {
    dragging.value = false;
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  dragDepth.value = 0;
  dragging.value = false;

  emitFiles(e.dataTransfer?.files ?? null);
}
</script>

<template>
  <div
    class="dropzone"
    :class="{ active: dragging }"
    @click="input?.click()"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <input
      ref="input"
      type="file"
      :accept="accept"
      :multiple="multiple"
      hidden
      @change="onChange"
    />

    <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
      <path
        d="M12 15V5m0 0 4 4m-4-4-4 4M5 19h14"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>

    <span>{{ label ?? "Drop files" }} or <strong>click</strong> to select</span>
  </div>
</template>

<style scoped>
.dropzone {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.6rem 1rem;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: 0.2s;
}

.dropzone:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
}

.dropzone.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-text-1);
}

.icon {
  width: 18px;
  height: 18px;
  flex: none;
}

span {
  font-size: 0.9rem;
}
</style>
