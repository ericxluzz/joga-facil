<template>
  <div class="section-skeleton" :class="`variant-${variant}`">
    <template v-if="variant === 'card'">
      <Skeleton width="40%" height="1.25rem" class="mb-2" />
      <Skeleton width="100%" :height="`${height}px`" />
    </template>

    <template v-else-if="variant === 'list'">
      <div v-for="i in count" :key="i" class="row">
        <Skeleton shape="circle" size="2.5rem" />
        <div class="row-body">
          <Skeleton width="60%" height="0.85rem" />
          <Skeleton width="40%" height="0.7rem" />
        </div>
        <Skeleton width="60px" height="1.2rem" />
      </div>
    </template>

    <template v-else-if="variant === 'kpi'">
      <div class="kpi-grid">
        <div v-for="i in count" :key="i" class="kpi-card">
          <Skeleton width="40%" height="0.75rem" class="mb-1" />
          <Skeleton width="70%" height="1.5rem" />
        </div>
      </div>
    </template>

    <template v-else-if="variant === 'chart'">
      <Skeleton width="30%" height="1rem" class="mb-2" />
      <Skeleton width="100%" :height="`${height}px`" />
    </template>

    <template v-else>
      <Skeleton width="100%" :height="`${height}px`" />
    </template>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';

withDefaults(
  defineProps<{
    variant?: 'card' | 'list' | 'kpi' | 'chart' | 'block';
    count?: number;
    height?: number;
  }>(),
  { variant: 'block', count: 4, height: 120 },
);
</script>

<style scoped>
.section-skeleton {
  width: 100%;
}

.row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--p-surface-100);
}

.row:last-child {
  border-bottom: none;
}

.row-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
}

.kpi-card {
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.75rem;
  padding: 1rem;
}

.mb-1 {
  margin-bottom: 0.25rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}
</style>
