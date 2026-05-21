<template>
  <div class="chart-wrap" :style="{ height: `${height}px` }">
    <canvas ref="canvasRef" />
  </div>
</template>

<script setup lang="ts">
import { Chart, registerables, type ChartConfiguration } from 'chart.js';

Chart.register(...registerables);

const props = withDefaults(
  defineProps<{
    config: ChartConfiguration;
    height?: number;
  }>(),
  { height: 240 },
);

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;

function buildOptions(): ChartConfiguration {
  return {
    ...props.config,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      ...(props.config.options || {}),
    },
  };
}

onMounted(() => {
  if (!canvasRef.value) return;
  chart = new Chart(canvasRef.value, buildOptions());
});

watch(
  () => props.config,
  () => {
    if (!chart || !canvasRef.value) return;
    chart.destroy();
    chart = new Chart(canvasRef.value, buildOptions());
  },
  { deep: true },
);

onBeforeUnmount(() => {
  chart?.destroy();
  chart = null;
});
</script>

<style scoped>
.chart-wrap {
  position: relative;
  width: 100%;
}
</style>
