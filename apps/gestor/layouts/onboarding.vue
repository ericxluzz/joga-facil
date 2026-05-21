<template>
  <div class="onboarding-layout">
    <!-- Header fixo -->
    <header class="onboarding-header">
      <div class="brand">
        <AppLogo :size="30" />
        <span class="brand-name">Joga Fácil</span>
      </div>
      <Button
        label="Sair"
        icon="pi pi-sign-out"
        severity="secondary"
        text
        size="small"
        @click="logout"
      />
    </header>

    <!-- Conteúdo central -->
    <main class="onboarding-main">
      <slot />
    </main>

    <!-- Rodapé -->
    <footer class="onboarding-footer">
      <span>© 2026 Joga Fácil · ericxluzz</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';

const supabase = useSupabaseClient();

async function logout() {
  await supabase.auth.signOut();
  await navigateTo('/login');
}
</script>

<style scoped>
.onboarding-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--p-surface-50);
  font-family: 'Poppins', sans-serif;
}

.onboarding-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: var(--p-surface-0);
  border-bottom: 1px solid var(--p-surface-200);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1.15rem;
  color: var(--p-text-color);
}

.brand-icon {
  color: var(--p-primary-500);
  font-size: 1.25rem;
}

.onboarding-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1rem;
  overflow-y: auto;
}

.onboarding-footer {
  padding: 1rem 2rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--p-text-color-secondary);
  border-top: 1px solid var(--p-surface-100);
}
</style>
