<template>
  <aside class="sidebar" :class="{ 'is-open': open }">

    <div class="sidebar-brand">
      <NuxtLink to="/painel" class="brand-link">
        <span class="brand-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="3" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <circle cx="8" cy="15" r="1" fill="currentColor" stroke="none" />
            <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
            <circle cx="16" cy="15" r="1" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <span class="brand-name">Joga Fácil</span>
      </NuxtLink>
      <button class="close-btn" aria-label="Fechar menu" @click="$emit('close')">
        <i class="pi pi-times" />
      </button>
    </div>

    <div v-if="tenant" class="tenant-card">
      <div class="tenant-avatar" :style="avatarStyle">
        <img v-if="logoUrl" :src="logoUrl" :alt="tenant.name" />
        <span v-else class="tenant-initial">{{ tenant.name.charAt(0).toUpperCase() }}</span>
      </div>
      <div class="tenant-info">
        <span class="tenant-name">{{ tenant.name }}</span>
        <a
          v-if="tenant.slug && clientUrl"
          :href="`${clientUrl}/r/${tenant.slug}`"
          target="_blank"
          rel="noopener"
          class="tenant-slug"
          :style="{ color: primaryColor }"
        >/{{ tenant.slug }} <i class="pi pi-external-link" /></a>
      </div>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section">
        <span class="nav-label">Operação</span>
        <NuxtLink to="/painel" class="nav-item" @click="$emit('close')">
          <span class="nav-icon">
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 8a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm8-8a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zm0 8a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/></svg>
          </span>
          <span>Painel</span>
        </NuxtLink>
        <NuxtLink to="/agenda" class="nav-item" @click="$emit('close')">
          <span class="nav-icon">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
          </span>
          <span>Agenda</span>
        </NuxtLink>
        <NuxtLink to="/aprovacoes" class="nav-item" @click="$emit('close')">
          <span class="nav-icon">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
          </span>
          <span class="nav-item-text">Aprovações</span>
          <span v-if="pendingApprovalsCount > 0" class="nav-badge">{{ pendingApprovalsCount }}</span>
        </NuxtLink>
        <NuxtLink to="/financeiro" class="nav-item" @click="$emit('close')">
          <span class="nav-icon">
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"/></svg>
          </span>
          <span>Financeiro</span>
        </NuxtLink>
      </div>

      <div class="nav-section">
        <span class="nav-label">Configurações</span>
        <NuxtLink to="/configuracoes/estabelecimento" class="nav-item" @click="$emit('close')">
          <span class="nav-icon">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clip-rule="evenodd"/></svg>
          </span>
          <span>Estabelecimento</span>
        </NuxtLink>
        <NuxtLink to="/configuracoes/quadras" class="nav-item" @click="$emit('close')">
          <span class="nav-icon">
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
          </span>
          <span>Quadras</span>
        </NuxtLink>
        <NuxtLink to="/configuracoes/servicos" class="nav-item" @click="$emit('close')">
          <span class="nav-icon">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>
          </span>
          <span>Serviços</span>
        </NuxtLink>
        <NuxtLink to="/configuracoes/agenda" class="nav-item" @click="$emit('close')">
          <span class="nav-icon">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
          </span>
          <span>Horários</span>
        </NuxtLink>
        <NuxtLink to="/configuracoes/regras" class="nav-item" @click="$emit('close')">
          <span class="nav-icon">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>
          </span>
          <span>Regras</span>
        </NuxtLink>
        <NuxtLink to="/configuracoes/recebimentos" class="nav-item" @click="$emit('close')">
          <span class="nav-icon">
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"/></svg>
          </span>
          <span class="nav-item-text">Recebimentos</span>
          <span
            v-if="kycStatus && kycStatus !== 'approved'"
            class="nav-badge nav-badge--warn"
            :title="`KYC: ${kycStatus}`"
          >!</span>
        </NuxtLink>
      </div>
    </nav>

    <div class="sidebar-footer">
      <button class="logout-btn" @click="logout">
        <svg viewBox="0 0 20 20" fill="currentColor" class="logout-icon"><path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd"/></svg>
        <span>Sair</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
defineProps<{ open?: boolean }>();
defineEmits<{ (e: 'close'): void }>();

const supabase = useSupabaseClient();
const config = useRuntimeConfig();
const { tenant } = useTenant();
const { pendingApprovalsCount } = useNotifications();

const clientUrl = computed(() => config.public.clientUrl as string);

const colorMap: Record<string, string> = {
  emerald: '#10B981', blue: '#3B82F6', orange: '#F97316',
  red: '#EF4444', purple: '#A855F7', slate: '#475569',
};

const primaryColor = computed(() => {
  const key = (tenant.value?.settings as any)?.primaryColor ?? 'emerald';
  return colorMap[key] ?? '#10B981';
});

const logoUrl = computed(() => (tenant.value?.settings as any)?.logoUrl ?? null);

const avatarStyle = computed(() => ({
  background: logoUrl.value ? 'transparent' : primaryColor.value,
}));

const kycStatus = ref<string | null>(null);

async function fetchKycStatus() {
  try {
    const data = await $fetch<{ status: string }>('/api/payments/account');
    kycStatus.value = data.status;
  } catch {
    kycStatus.value = null;
  }
}

onMounted(() => fetchKycStatus());

async function logout() {
  await supabase.auth.signOut();
  await navigateTo('/login');
}
</script>

<style scoped>
.sidebar {
  width: 256px;
  flex-shrink: 0;
  background: #0f172a;
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 25;
  overflow-y: auto;
  transition: transform 0.25s cubic-bezier(.4,0,.2,1);
}

/* ── Brand ── */
.sidebar-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 1.25rem;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.brand-link {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  text-decoration: none;
}
.brand-icon {
  width: 32px;
  height: 32px;
  background: #22c55e;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}
.brand-icon svg { width: 17px; height: 17px; }
.brand-name {
  font-weight: 700;
  font-size: 0.9375rem;
  color: #f8fafc;
  letter-spacing: -0.01em;
}

.close-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: rgba(255,255,255,0.4);
  padding: 0.375rem;
  border-radius: 6px;
}
.close-btn:hover { background: rgba(255,255,255,0.08); }

/* ── Tenant card ── */
.tenant-card {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin: 1rem 1rem 0;
  padding: 0.625rem 0.75rem;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
}
.tenant-avatar {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #10B981;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  color: #fff;
  font-weight: 700;
  font-size: 0.875rem;
}
.tenant-avatar img { width: 100%; height: 100%; object-fit: cover; }
.tenant-initial { color: #fff; font-weight: 700; font-size: 0.875rem; }
.tenant-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.tenant-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tenant-slug {
  font-size: 0.6875rem;
  color: #10B981;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.2rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}
.tenant-slug:hover { text-decoration: underline; }
.tenant-slug i { font-size: 0.5625rem; }

/* ── Nav ── */
.sidebar-nav {
  flex: 1;
  padding: 1rem 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  overflow-y: auto;
}
.nav-section { display: flex; flex-direction: column; gap: 0.125rem; }
.nav-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,0.28);
  padding: 0 0.625rem;
  margin-bottom: 0.375rem;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5625rem 0.625rem;
  border-radius: 8px;
  color: rgba(255,255,255,0.55);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.12s, color 0.12s;
  position: relative;
}
.nav-item:hover {
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.9);
}
.nav-item.router-link-active {
  background: rgba(34,197,94,0.14);
  color: #4ade80;
  font-weight: 600;
}
.nav-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.nav-icon svg { width: 16px; height: 16px; }
.nav-item-text { flex: 1; }
.nav-badge {
  background: #ef4444;
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
}
.nav-badge--warn { background: #f59e0b; color: #1c1917; }

/* ── Footer ── */
.sidebar-footer {
  padding: 0.875rem;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.logout-btn {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  background: none;
  border: none;
  cursor: pointer;
  width: 100%;
  padding: 0.5rem 0.625rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255,255,255,0.4);
  font-family: inherit;
  transition: background 0.12s, color 0.12s;
}
.logout-btn:hover {
  background: rgba(239,68,68,0.12);
  color: #f87171;
}
.logout-icon { width: 16px; height: 16px; }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .sidebar { transform: translateX(-100%); }
  .sidebar.is-open { transform: translateX(0); }
  .close-btn { display: flex; }
}
</style>
