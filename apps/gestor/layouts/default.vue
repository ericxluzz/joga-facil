<template>
  <div class="app-shell">
    <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />

    <div class="app-overlay" :class="{ 'is-active': sidebarOpen }" @click="sidebarOpen = false" />

    <div class="app-body">
      <!-- Header interno por página -->
      <header class="app-header">
        <div class="app-shell-inner app-header-inner">
          <button class="mobile-menu-btn" aria-label="Menu" @click="sidebarOpen = true">
            <i class="pi pi-bars" />
          </button>

          <div class="header-search">
            <i class="pi pi-search search-icon" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar reservas, clientes…"
              class="search-input"
              @keyup.enter="onSearch"
            />
          </div>

          <div class="header-actions">
            <button class="icon-btn" :aria-label="isDark ? 'Modo claro' : 'Modo escuro'" @click="toggle">
              <i :class="isDark ? 'pi pi-sun' : 'pi pi-moon'" />
            </button>

            <div class="notif-wrap">
              <button class="icon-btn" aria-label="Notificações" @click="openNotifs">
                <i class="pi pi-bell" />
                <span v-if="unseenCount > 0" class="notif-dot" />
              </button>
            </div>

            <button class="avatar-btn" aria-label="Perfil" @click="openProfile">
              <span class="avatar-circle">{{ userInitials }}</span>
            </button>
          </div>
        </div>
      </header>

      <main class="app-main">
        <div class="app-shell-inner">
          <slot />
        </div>
      </main>
    </div>

    <!-- Popovers fora do fluxo -->
    <Teleport to="body">
      <div v-if="notifOpen" class="popover-backdrop" @click="notifOpen = false" />
      <div v-if="notifOpen" class="popover notif-popover">
        <div class="popover-head">
          <span>Notificações</span>
          <button v-if="unseenCount > 0" class="text-btn" @click="markAllSeen">Marcar como lidas</button>
        </div>
        <div v-if="notifLoading" class="popover-empty">
          <i class="pi pi-spin pi-spinner" />
        </div>
        <div v-else-if="notifItems.length === 0" class="popover-empty">
          <i class="pi pi-bell-slash" />
          <p>Nada novo por aqui.</p>
        </div>
        <ul v-else class="notif-list">
          <li
            v-for="n in notifItems.slice(0, 8)"
            :key="n.id"
            class="notif-item"
            :class="{ 'is-unseen': isUnseen(n) }"
            @click="onNotifClick(n); notifOpen = false"
          >
            <span class="notif-icon"><i :class="iconFor(n.type)" /></span>
            <div class="notif-body">
              <span class="notif-title">{{ n.title }}</span>
              <span class="notif-desc">{{ n.description }}</span>
              <span class="notif-time">{{ formatTime(n.createdAt) }}</span>
            </div>
          </li>
        </ul>
      </div>

      <div v-if="profileOpen" class="popover-backdrop" @click="profileOpen = false" />
      <div v-if="profileOpen" class="popover profile-popover">
        <div class="profile-info">
          <span class="avatar-circle avatar-lg">{{ userInitials }}</span>
          <div>
            <p class="profile-name">{{ userName }}</p>
            <p class="profile-email">{{ userEmail }}</p>
          </div>
        </div>
        <div class="profile-actions">
          <button class="profile-btn" @click="profileOpen = false; navigateTo('/configuracoes/estabelecimento')">
            <i class="pi pi-building" /> Estabelecimento
          </button>
          <button class="profile-btn danger" @click="logout">
            <i class="pi pi-sign-out" /> Sair
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Notification } from '../composables/useNotifications';

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const { isDark, toggle } = useTheme();
const { fetchTenant, tenant } = useTenant();
const { items: notifItems, loading: notifLoading, unseenCount, markAllSeen: doMarkSeen, startPolling } = useNotifications();

const sidebarOpen = ref(false);
const notifOpen = ref(false);
const profileOpen = ref(false);
const searchQuery = ref('');
const lastSeen = useState<number>('notificationsLastSeen');

const userEmail = computed(() => user.value?.email || '');
const userName = computed(() => {
  const m = (user.value?.user_metadata as { full_name?: string })?.full_name;
  return m || userEmail.value.split('@')[0] || 'Gestor';
});
const userInitials = computed(() => userName.value.charAt(0).toUpperCase());

function isUnseen(n: Notification) {
  return new Date(n.createdAt).getTime() > (lastSeen.value || 0);
}

onMounted(async () => {
  if (!tenant.value) {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { await navigateTo('/login'); return; }
    await fetchTenant();
    if (!tenant.value) { await navigateTo('/onboarding'); }
  }
  startPolling(30_000);
});

function openNotifs() { notifOpen.value = !notifOpen.value; profileOpen.value = false; }
function openProfile() { profileOpen.value = !profileOpen.value; notifOpen.value = false; }
function markAllSeen() { doMarkSeen(); }

function iconFor(type: Notification['type']) {
  if (type === 'pending_approval') return 'pi pi-clock';
  if (type === 'payment_received') return 'pi pi-wallet';
  return 'pi pi-calendar';
}

function formatTime(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'Agora';
  if (m < 60) return `Há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Há ${h}h`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

function onNotifClick(n: Notification) {
  if (n.type === 'pending_approval') return navigateTo('/aprovacoes');
  if (n.type === 'payment_received') return navigateTo('/financeiro');
  return navigateTo('/agenda');
}

function onSearch() {
  if (!searchQuery.value.trim()) return;
  navigateTo(`/agenda?q=${encodeURIComponent(searchQuery.value.trim())}`);
}

async function logout() {
  profileOpen.value = false;
  await supabase.auth.signOut();
  await navigateTo('/login');
}
</script>

<style scoped>
/* ── Shell ──────────────────────────────────────── */
.app-shell {
  display: flex;
  min-height: 100vh;
  background: #f8fafc;
  font-family: 'Inter', 'Poppins', sans-serif;
  overflow-x: hidden;
}

.app-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-left: 256px;
  width: calc(100% - 256px);
}

/* Conteúdo centralizado (header + páginas) */
.app-shell-inner {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

/* ── Header ─────────────────────────────────────── */
.app-header {
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 20;
  padding: 0 1.75rem;
}
.app-header-inner {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.125rem;
  color: #6b7280;
  padding: 0.375rem;
  border-radius: 6px;
  line-height: 1;
}
.mobile-menu-btn:hover { background: #f3f4f6; }

.header-search {
  flex: 1;
  position: relative;
  max-width: 420px;
}
.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 0.875rem;
  pointer-events: none;
}
.search-input {
  width: 100%;
  background: #f5f6fa;
  border: 1.5px solid transparent;
  border-radius: 10px;
  padding: 0.5rem 0.875rem 0.5rem 2.25rem;
  font-size: 0.875rem;
  color: #111827;
  outline: none;
  transition: border-color 0.15s, background 0.15s;
  font-family: inherit;
}
.search-input::placeholder { color: #9ca3af; }
.search-input:focus { background: #fff; border-color: #6366f1; }

.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.icon-btn {
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 1rem;
  transition: background 0.12s;
}
.icon-btn:hover { background: #f3f4f6; color: #111827; }

.notif-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 7px;
  height: 7px;
  background: #ef4444;
  border-radius: 50%;
  border: 1.5px solid #fff;
}

.avatar-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  border-radius: 50%;
}
.avatar-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.avatar-lg { width: 44px; height: 44px; font-size: 1.125rem; }

/* ── Main ────────────────────────────────────────── */
.app-main {
  flex: 1;
  padding: 2rem 1.75rem 3rem;
  overflow-y: auto;
  width: 100%;
}

/* ── Overlay ─────────────────────────────────────── */
.app-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 24;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s;
}

/* ── Popovers ────────────────────────────────────── */
.popover-backdrop {
  position: fixed;
  inset: 0;
  z-index: 49;
}
.popover {
  position: fixed;
  top: 64px;
  right: 1.5rem;
  z-index: 50;
  background: #fff;
  border: 1px solid #eaecf0;
  border-radius: 14px;
  box-shadow: 0 8px 30px rgba(0,0,0,.12);
  padding: 1rem;
  animation: pop-in 0.15s ease;
}
@keyframes pop-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Notificações */
.notif-popover { width: 340px; }
.popover-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #eaecf0;
  font-weight: 600;
  font-size: 0.9375rem;
  color: #111827;
  margin-bottom: 0.5rem;
}
.text-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8125rem;
  color: #6366f1;
  font-family: inherit;
}
.text-btn:hover { text-decoration: underline; }
.popover-empty {
  padding: 2rem 0;
  text-align: center;
  color: #9ca3af;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}
.popover-empty i { font-size: 1.75rem; }
.notif-list { list-style: none; margin: 0; padding: 0; max-height: 320px; overflow-y: auto; }
.notif-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.625rem 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.1s;
}
.notif-item:hover { background: #f9fafb; }
.notif-item.is-unseen { background: #f0f0ff; }
.notif-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #ede9fe;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6366f1;
  font-size: 0.8125rem;
}
.notif-body { display: flex; flex-direction: column; gap: 0.1rem; flex: 1; min-width: 0; }
.notif-title { font-size: 0.8125rem; font-weight: 600; color: #111827; }
.notif-desc  { font-size: 0.75rem; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.notif-time  { font-size: 0.6875rem; color: #9ca3af; }

/* Perfil */
.profile-popover { width: 230px; }
.profile-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 0.875rem;
  border-bottom: 1px solid #eaecf0;
  margin-bottom: 0.5rem;
}
.profile-name { margin: 0; font-weight: 600; font-size: 0.875rem; color: #111827; }
.profile-email { margin: 0; font-size: 0.75rem; color: #6b7280; }
.profile-actions { display: flex; flex-direction: column; gap: 0.25rem; }
.profile-btn {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem 0.625rem;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #374151;
  font-family: inherit;
  width: 100%;
  text-align: left;
  transition: background 0.1s;
}
.profile-btn:hover { background: #f3f4f6; }
.profile-btn.danger { color: #ef4444; }
.profile-btn.danger:hover { background: #fef2f2; }

/* ── Responsive ─────────────────────────────────── */
@media (max-width: 1024px) {
  .app-body { margin-left: 0; width: 100%; }
  .mobile-menu-btn { display: flex; }
  .app-overlay { display: block; }
  .app-overlay.is-active { opacity: 1; pointer-events: auto; }
  .app-main { padding: 1.25rem 1rem 2rem; }
  .app-header { padding: 0 1rem; }
  .header-search { max-width: none; }
}

@media (max-width: 640px) {
  .app-header { padding: 0 1rem; gap: 0.5rem; }
  .header-search { display: none; }
  .header-actions { gap: 0.25rem; }
}
</style>
