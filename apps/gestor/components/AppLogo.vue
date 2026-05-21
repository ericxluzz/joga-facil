<template>
  <div class="logo" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" :width="size" :height="size">
      <defs>
        <linearGradient :id="gradientId" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="var(--p-primary-400)" />
          <stop offset="100%" stop-color="var(--p-primary-700)" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" :fill="`url(#${gradientId})`" />
      <path
        d="M16 4 L14 9 L9 7.5 L11 12 L7 14.5 L11 17 L9 22 L14 20.5 L16 25 L18 20.5 L23 22 L21 17 L25 14.5 L21 12 L23 7.5 L18 9 Z"
        fill="white"
        fill-opacity="0.95"
        stroke="white"
        stroke-width="0.4"
        stroke-linejoin="round"
      />
      <circle cx="16" cy="16" r="2.4" fill="var(--p-primary-700)" />
    </svg>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ size?: number }>(), { size: 32 });
const _ = props;
const gradientId = `jf-ball-gradient-${Math.random().toString(36).slice(2, 8)}`;
</script>

<style scoped>
.logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
