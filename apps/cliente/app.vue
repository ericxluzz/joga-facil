<template>
  <div class="app" :style="appStyle">
    <NuxtPage />
    <Toast position="bottom-center" />
  </div>
</template>

<script setup lang="ts">
import Toast from 'primevue/toast';
import { computed } from 'vue';

const { tenant } = useReserva();

const colorPalettes: Record<string, Record<number, string>> = {
  emerald: {
    50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 300: '#6EE7B7', 400: '#34D399',
    500: '#10B981', 600: '#059669', 700: '#047857', 800: '#065F46', 900: '#064E3B', 950: '#022C22'
  },
  blue: {
    50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD', 400: '#60A5FA',
    500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8', 800: '#1E40AF', 900: '#1E3A8A', 950: '#172554'
  },
  orange: {
    50: '#FFF7ED', 100: '#FFEDD5', 200: '#FED7AA', 300: '#FDBA74', 400: '#FB923C',
    500: '#F97316', 600: '#EA580C', 700: '#C2410C', 800: '#9A3412', 900: '#7C2D12', 950: '#431407'
  },
  purple: {
    50: '#FAF5FF', 100: '#F3E8FF', 200: '#E9D5FF', 300: '#D8B4FE', 400: '#C084FC',
    500: '#A855F7', 600: '#9333EA', 700: '#7E22CE', 800: '#6B21A8', 900: '#581C87', 950: '#3B0764'
  },
  slate: {
    50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0', 300: '#CBD5E1', 400: '#94A3B8',
    500: '#475569', 600: '#334155', 700: '#1E293B', 800: '#0F172A', 900: '#020617', 950: '#000000'
  }
};

const appStyle = computed(() => {
  const colorName = tenant.value?.settings?.primaryColor || 'emerald';
  const palette = colorPalettes[colorName] || colorPalettes.emerald;
  
  const styles: Record<string, string> = {};
  for (const [shade, hex] of Object.entries(palette)) {
    styles[`--p-primary-${shade}`] = hex;
  }
  return styles;
});
</script>

<style>
.app {
  min-height: 100dvh;
  max-width: 480px;
  margin: 0 auto;
  background: var(--p-surface-50); /* slightly tinted background for mobile app feel */
}
@media (min-width: 768px) {
  .app {
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  }
}
</style>
