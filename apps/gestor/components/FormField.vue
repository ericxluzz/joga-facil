<template>
  <div class="form-field">
    <label v-if="label" class="label">{{ label }}</label>
    <slot />
    <div v-if="hint" class="hint">{{ hint }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label?: string; hint?: string }>();
</script>

<style scoped>
.form-field {
  margin-bottom: 1rem;
}
.label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 0.375rem;
  color: var(--p-surface-700);
}
.hint {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: var(--p-surface-500);
}
</style>
