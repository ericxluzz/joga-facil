<script setup lang="ts">
definePageMeta({ layout: 'auth' });

onMounted(async () => {
  // Supabase processa o token automaticamente via @nuxtjs/supabase
  // Aqui apenas redirecionamos para o destino
  await new Promise((r) => setTimeout(r, 800));
  await navigateTo('/painel');
});
</script>

<template>
  <div style="text-align: center; padding: 2rem;">
    <i class="pi pi-spin pi-spinner" style="font-size: 2rem; color: var(--p-primary-500);" />
    <p style="margin-top: 1rem;">Entrando…</p>
  </div>
</template>
