<template>
  <div class="layout">
    <!-- Topbar Mobile -->
    <header class="mobile-topbar">
      <div class="brand">
        <i class="pi pi-calendar brand-icon"></i>
        <span class="brand-name">Agenda-Slim</span>
      </div>
      <Button icon="pi pi-bars" text @click="mobileMenuOpen = true" />
    </header>

    <!-- Overlay Mobile -->
    <div 
      class="sidebar-overlay" 
      :class="{ 'is-open': mobileMenuOpen }" 
      @click="mobileMenuOpen = false"
    ></div>

    <!-- Sidebar -->
    <aside class="sidebar" :class="{ 'is-open': mobileMenuOpen }">
      <div class="brand desktop-brand">
        <i class="pi pi-calendar brand-icon"></i>
        <span class="brand-name">Agenda-Slim</span>
      </div>
      
      <nav class="nav">
        <NuxtLink to="/dashboard" class="nav-item" @click="mobileMenuOpen = false">
          <i class="pi pi-home" /> <span>Dashboard</span>
        </NuxtLink>
        <NuxtLink to="/agenda" class="nav-item" @click="mobileMenuOpen = false">
          <i class="pi pi-calendar" /> <span>Agenda</span>
        </NuxtLink>
        <NuxtLink to="/aprovacoes" class="nav-item" @click="mobileMenuOpen = false">
          <i class="pi pi-check-circle" /> 
          <span style="flex: 1">Aprovações</span>
          <Badge :value="pendingApprovals" severity="danger" size="small" v-if="pendingApprovals > 0" />
        </NuxtLink>
        <NuxtLink to="/financeiro" class="nav-item" @click="mobileMenuOpen = false">
          <i class="pi pi-wallet" /> <span>Financeiro</span>
        </NuxtLink>
        
        <div class="nav-divider" />
        
        <NuxtLink to="/configuracoes/estabelecimento" class="nav-item" @click="mobileMenuOpen = false">
          <i class="pi pi-building" /> <span>Estabelecimento</span>
        </NuxtLink>
        <NuxtLink to="/configuracoes/quadras" class="nav-item" @click="mobileMenuOpen = false">
          <i class="pi pi-objects-column" /> <span>Quadras</span>
        </NuxtLink>
        <NuxtLink to="/configuracoes/servicos" class="nav-item" @click="mobileMenuOpen = false">
          <i class="pi pi-tag" /> <span>Serviços</span>
        </NuxtLink>
        <NuxtLink to="/configuracoes/agenda" class="nav-item" @click="mobileMenuOpen = false">
          <i class="pi pi-clock" /> <span>Horários</span>
        </NuxtLink>
        <NuxtLink to="/configuracoes/regras" class="nav-item" @click="mobileMenuOpen = false">
          <i class="pi pi-cog" /> <span>Regras</span>
        </NuxtLink>
      </nav>

      <div class="sidebar-footer">
        <div class="user-profile">
          <Avatar :label="userInitials" size="large" shape="circle" style="background-color: var(--p-primary-100); color: var(--p-primary-700)" />
          <div class="user-info">
            <span class="user-name">{{ userName }}</span>
            <span class="user-email">{{ userEmail }}</span>
          </div>
        </div>
        <button class="logout" @click="logout">
          <i class="pi pi-sign-out" /> Sair
        </button>
      </div>
    </aside>

    <main class="main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from 'primevue/button';
import Badge from 'primevue/badge';
import Avatar from 'primevue/avatar';

const supabase = useSupabaseClient();
const user = useSupabaseUser();

const mobileMenuOpen = ref(false);

// Mock de aprovações pendentes para visualizar o Badge
const pendingApprovals = ref(3);

const userEmail = computed(() => user.value?.email || 'gestor@agendaslim.com');
const userName = computed(() => {
  const metaName = user.value?.user_metadata?.full_name;
  if (metaName) return metaName;
  return userEmail.value.split('@')[0];
});
const userInitials = computed(() => {
  return userName.value.substring(0, 1).toUpperCase();
});

async function logout() {
  await supabase.auth.signOut();
  await navigateTo('/login');
}
</script>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  background: var(--p-surface-50);
  font-family: 'Poppins', sans-serif;
}

/* Mobile Topbar */
.mobile-topbar {
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: var(--p-surface-0);
  border-bottom: 1px solid var(--p-surface-200);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--p-text-color);
}
.brand-icon {
  color: var(--p-primary-500);
  font-size: 1.5rem;
}

/* Sidebar */
.sidebar {
  width: 260px;
  background: var(--p-surface-0);
  border-right: 1px solid var(--p-surface-200);
  display: flex;
  flex-direction: column;
  padding: 1.5rem 0.75rem;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  transition: transform 0.3s ease;
}

.desktop-brand {
  padding: 0 0.75rem 1.5rem;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  color: var(--p-surface-700);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background 120ms;
}

.nav-item:hover {
  background: var(--p-surface-100);
}

.nav-item.router-link-active {
  background: var(--p-primary-50);
  color: var(--p-primary-700);
}

.nav-divider {
  height: 1px;
  background: var(--p-surface-200);
  margin: 0.5rem 0.75rem;
}

/* Sidebar Footer & Profile */
.sidebar-footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--p-surface-200);
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
}

.user-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.user-name {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--p-text-color);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.user-email {
  font-size: 0.75rem;
  color: var(--p-text-color-secondary);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.logout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  background: none;
  border: 1px solid var(--p-surface-200);
  padding: 0.625rem;
  border-radius: 0.5rem;
  color: var(--p-text-color-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.logout:hover {
  background: var(--p-surface-100);
  color: var(--p-text-color);
}

/* Main Content */
.main {
  flex: 1;
  padding: 2rem;
  margin-left: 260px; /* Compensa a sidebar fixa */
  overflow-y: auto;
}

/* Overlay para Mobile */
.sidebar-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 15;
  opacity: 0;
  transition: opacity 0.3s ease;
}

/* Responsividade Mobile */
@media (max-width: 1024px) {
  .mobile-topbar {
    display: flex;
  }
  
  .sidebar {
    transform: translateX(-100%);
  }
  
  .sidebar.is-open {
    transform: translateX(0);
  }
  
  .sidebar-overlay {
    display: block;
    pointer-events: none;
  }
  
  .sidebar-overlay.is-open {
    opacity: 1;
    pointer-events: auto;
  }
  
  .main {
    margin-left: 0;
    padding-top: 5rem; /* Compensa a topbar fixa */
  }
}
</style>
