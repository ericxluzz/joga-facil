<template>
  <nav class="bottom-nav">
    <NuxtLink
      v-if="slug"
      :to="`/r/${slug}/reservar`"
      class="nav-item"
      :class="{ active: isReservar }"
    >
      <i class="pi pi-calendar" />
      <span>Reservar</span>
    </NuxtLink>
    <span v-else class="nav-item disabled">
      <i class="pi pi-calendar" />
      <span>Reservar</span>
    </span>
    <NuxtLink to="/minhas-reservas" class="nav-item" :class="{ active: isMinhasReservas }">
      <i class="pi pi-list" />
      <span>Meus agendamentos</span>
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
import { useStorage } from '@vueuse/core';

const route = useRoute();

const storedSlug = useStorage('jf_last_slug', '');

const slug = computed(() => {
  const routeSlug = route.params.slug as string;
  if (routeSlug) {
    storedSlug.value = routeSlug;
    return routeSlug;
  }
  return storedSlug.value || '';
});

const isReservar = computed(() => route.path.includes('/reservar') || route.path.match(/\/r\/[^/]+$/) !== null);
const isMinhasReservas = computed(() => route.path === '/minhas-reservas');
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  max-width: 480px;
  margin: 0 auto;
  background: var(--p-surface-0, #fff);
  border-top: 1px solid var(--p-surface-100, #e8ecf0);
  display: flex;
  z-index: 40;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 10px 0 11px;
  text-decoration: none;
  color: var(--p-text-muted-color, #94a3b8);
  font-size: 0.65rem;
  font-weight: 600;
  transition: color 0.15s;
}
.nav-item .pi { font-size: 1.15rem; }
.nav-item.active { color: var(--p-primary-500, #10b981); }
.nav-item.disabled { opacity: 0.35; cursor: default; }
</style>
