<template>
  <div class="editable-section" :class="{ 'is-editing': editing }">
    <header v-if="title || $slots.actions" class="es-header">
      <div>
        <h2 v-if="title" class="es-title">{{ title }}</h2>
        <p v-if="subtitle" class="es-subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="es-actions">
        <slot name="actions" />
      </div>
    </header>

    <div class="es-body">
      <slot v-if="editing" name="edit" />
      <slot v-else name="view" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  editing: boolean;
  title?: string;
  subtitle?: string;
}>();
</script>

<style scoped>
.editable-section {
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 1rem;
  padding: 1.5rem;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.editable-section.is-editing {
  border-color: var(--p-primary-300);
  box-shadow: 0 0 0 4px var(--p-primary-50);
}

.es-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.es-title {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0;
  color: var(--p-text-color);
}

.es-subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: var(--p-text-color-secondary);
}

.es-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.es-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

:deep(.view-field) {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0;
  border-bottom: 1px dashed var(--p-surface-100);
}

:deep(.view-field:last-child) {
  border-bottom: none;
}

:deep(.view-field-label) {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--p-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

:deep(.view-field-value) {
  font-size: 0.95rem;
  color: var(--p-text-color);
  font-weight: 500;
  word-break: break-word;
}

:deep(.view-field-value.muted) {
  color: var(--p-text-color-secondary);
  font-style: italic;
  font-weight: 400;
}
</style>
