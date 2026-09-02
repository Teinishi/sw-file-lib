<script setup lang="ts">
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { createSwLightGroup } from "@sw-file-lib/three";

const props = defineProps<{
  objects: THREE.Object3D[];
}>();

const container = ref<HTMLDivElement>();

let context:
  | {
      scene: THREE.Scene;
      renderer: THREE.WebGLRenderer;
      camera: THREE.PerspectiveCamera;
      controls: OrbitControls;
    }
  | undefined;

let resizeObserver: ResizeObserver | undefined;
let animationFrame: number | undefined;
const managedObjects = new WeakSet<THREE.Object3D>();

function syncSceneObjects() {
  if (context === undefined) return;

  const currentObjects = new Set(props.objects);

  const children = [...context.scene.children];
  for (const child of children) {
    if (managedObjects.has(child) && !currentObjects.has(child)) {
      context.scene.remove(child);
      managedObjects.delete(child);
    }
  }

  for (const object of props.objects) {
    if (object.parent !== context.scene) {
      managedObjects.add(object);
      context.scene.add(object);
    }
  }
}

function init(container: HTMLElement) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x20242a);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.x = 1;
  camera.position.y = 2;
  camera.position.z = 3;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
  });
  renderer.setSize(container.clientWidth, container.clientHeight, false);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.mouseButtons.LEFT = undefined;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
  controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;

  scene.add(createSwLightGroup());

  context = { scene, renderer, camera, controls };
  syncSceneObjects();
}

function animate() {
  animationFrame = requestAnimationFrame(animate);
  if (context === undefined) return;

  context.controls.update();
  context.renderer.render(context.scene, context.camera);
}

onMounted(() => {
  if (!container.value) return;

  init(container.value);
  animate();

  resizeObserver = new ResizeObserver(([entry]) => {
    if (entry === undefined || context === undefined) return;

    const { width, height } = entry.contentRect;
    if (width === 0 || height === 0) return;
    context.camera.aspect = width / height;
    context.camera.updateProjectionMatrix();

    context.renderer.setSize(width, height, false);
    context.renderer.render(context.scene, context.camera);
  });

  resizeObserver.observe(container.value);
});

onUnmounted(() => {
  if (animationFrame !== undefined) {
    cancelAnimationFrame(animationFrame);
  }

  resizeObserver?.disconnect();
  context?.renderer.dispose();
});

watch(() => props.objects, syncSceneObjects);
</script>

<template>
  <div ref="container" class="viewer" />
</template>

<style scoped>
.viewer {
  width: 100%;
  height: 100%;
}
</style>
