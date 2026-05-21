<template>
  <div class="copy-link" :class="{ compact }">
    <a v-if="!iconOnly" :href="url" target="_blank" rel="noopener" class="link">
      <i class="pi pi-external-link link-icon" />
      <span class="link-text">{{ displayLabel }}</span>
    </a>
    <button type="button" class="copy-btn" :class="{ copied }" @click="copy" :aria-label="`Copiar ${url}`">
      <i :class="copied ? 'pi pi-check' : 'pi pi-copy'" />
    </button>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    url: string;
    label?: string;
    iconOnly?: boolean;
    compact?: boolean;
  }>(),
  { iconOnly: false, compact: false },
);

const toast = useToast?.();
const copied = ref(false);

const displayLabel = computed(() => props.label || stripProtocol(props.url));

function stripProtocol(u: string) {
  return u.replace(/^https?:\/\//, '');
}

async function copy() {
  try {
    await navigator.clipboard.writeText(props.url);
    copied.value = true;
    toast?.add({ severity: 'success', summary: 'Link copiado', life: 2000 });
    setTimeout(() => {
      copied.value = false;
    }, 1500);
  } catch (err) {
    toast?.add({
      severity: 'error',
      summary: 'Falha ao copiar',
      detail: String(err),
      life: 3000,
    });
  }
}
</script>

<style scoped>
.copy-link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background: var(--p-surface-100);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.625rem;
  padding: 0.25rem 0.25rem 0.25rem 0.625rem;
  max-width: 100%;
}

.copy-link.compact {
  padding: 0.125rem 0.125rem 0.125rem 0.5rem;
}

.link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  text-decoration: none;
  color: var(--p-text-color);
  font-size: 0.85rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
}

.link-icon {
  color: var(--p-primary-500);
  font-size: 0.85rem;
}

.link-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  color: var(--p-text-color-secondary);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.copy-btn:hover {
  background: var(--p-primary-50);
  color: var(--p-primary-600);
  border-color: var(--p-primary-200);
}

.copy-btn.copied {
  background: var(--p-primary-500);
  color: white;
  border-color: var(--p-primary-500);
}
</style>
