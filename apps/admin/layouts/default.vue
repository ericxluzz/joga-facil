<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <div class="sidebar-brand">
        <span class="brand-icon">⚡</span>
        <span class="brand-name">Admin Panel</span>
      </div>
      <nav class="admin-nav">
        <NuxtLink to="/dashboard" class="nav-item">
          <i class="pi pi-chart-bar" /><span>Dashboard</span>
        </NuxtLink>
        <NuxtLink to="/arenas" class="nav-item">
          <i class="pi pi-building" /><span>Arenas</span>
        </NuxtLink>
        <NuxtLink to="/pagamentos" class="nav-item">
          <i class="pi pi-credit-card" /><span>Pagamentos</span>
        </NuxtLink>
        <NuxtLink to="/webhooks" class="nav-item">
          <i class="pi pi-bolt" /><span>Webhooks</span>
        </NuxtLink>
        <NuxtLink to="/configuracoes" class="nav-item">
          <i class="pi pi-cog" /><span>Configurações</span>
        </NuxtLink>
      </nav>
      <div class="sidebar-footer">
        <button class="logout-btn" @click="logout">
          <i class="pi pi-sign-out" /><span>Sair</span>
        </button>
      </div>
    </aside>
    <main class="admin-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient();
async function logout() {
  await supabase.auth.signOut();
  await navigateTo('/login');
}
</script>

<style scoped>
.admin-shell { display: flex; min-height: 100vh; background: #f8fafc; }
.admin-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #0f172a;
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
}
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 60px;
  padding: 0 1.25rem;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  color: #f8fafc;
  font-weight: 700;
}
.brand-icon { font-size: 1.25rem; }
.admin-nav { flex: 1; padding: 1rem 0.75rem; display: flex; flex-direction: column; gap: 0.125rem; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.625rem;
  border-radius: 8px;
  color: rgba(255,255,255,0.55);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.12s, color 0.12s;
}
.nav-item:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.9); }
.nav-item.router-link-active { background: rgba(34,197,94,0.14); color: #4ade80; font-weight: 600; }
.nav-item i { width: 16px; }
.sidebar-footer { padding: 0.875rem; border-top: 1px solid rgba(255,255,255,0.06); }
.logout-btn {
  display: flex; align-items: center; gap: 0.5rem;
  background: none; border: none; cursor: pointer;
  color: rgba(255,255,255,0.4); font-size: 0.875rem;
  padding: 0.5rem 0.625rem; border-radius: 8px;
  font-family: inherit; width: 100%;
  transition: color 0.12s;
}
.logout-btn:hover { color: #f87171; }
.admin-main { flex: 1; padding: 2rem; max-width: 1200px; }
</style>
