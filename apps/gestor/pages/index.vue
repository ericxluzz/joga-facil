<script setup lang="ts">
const user = useSupabaseUser();
const config = useRuntimeConfig();
const mockAuth = config.public.mockAuth;

// Em produção redireciona pra login; em mock dev vai pro dashboard
onMounted(async () => {
  if (mockAuth) return navigateTo('/painel');
  if (user.value) return navigateTo('/painel');
  return navigateTo('/login');
});
</script>

<template>
  <div style="padding: 4rem; text-align: center;">
    <p>Carregando…</p>
  </div>
</template>
