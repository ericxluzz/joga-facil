<template>
  <header class="topbar">
    <div class="topbar-left">
      <Button
        v-if="showMenuButton"
        icon="pi pi-bars"
        text
        rounded
        aria-label="Menu"
        class="menu-btn"
        @click="$emit('toggle-menu')"
      />
      <NuxtLink to="/painel" class="brand">
        <AppLogo :size="32" />
        <span class="brand-name">Joga Fácil</span>
      </NuxtLink>
    </div>

    <div class="topbar-center">
      <IconField class="search-field">
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="searchQuery"
          placeholder="Buscar reservas, clientes, quadras…"
          class="search-input"
          @keyup.enter="onSearch"
        />
      </IconField>
    </div>

    <div class="topbar-right">
      <Button
        :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'"
        text
        rounded
        :aria-label="isDark ? 'Modo claro' : 'Modo escuro'"
        @click="toggle"
      />

      <div class="notif-wrapper">
        <Button
          icon="pi pi-bell"
          text
          rounded
          aria-label="Notificações"
          @click="openNotifs"
        />
        <Badge
          v-if="unseenCount > 0"
          :value="unseenCount > 9 ? '9+' : String(unseenCount)"
          severity="danger"
          class="notif-badge"
        />
      </div>

      <Popover ref="notifPopover">
        <div class="notif-panel">
          <div class="notif-panel-head">
            <span class="font-semibold">Notificações</span>
            <Button
              v-if="unseenCount > 0"
              label="Marcar como lidas"
              text
              size="small"
              @click="markAllSeen"
            />
          </div>
          <Divider class="my-0" />
          <div v-if="loading" class="notif-empty">
            <ProgressSpinner style="width:32px;height:32px" strokeWidth="4" />
          </div>
          <div v-else-if="items.length === 0" class="notif-empty">
            <i class="pi pi-bell-slash text-3xl text-color-secondary mb-2" />
            <p class="text-color-secondary text-sm m-0">Nada novo por aqui.</p>
          </div>
          <ul v-else class="notif-list">
            <li
              v-for="n in items.slice(0, 8)"
              :key="n.id"
              class="notif-item"
              :class="{ 'notif-unseen': isUnseen(n) }"
              @click="onNotifClick(n)"
            >
              <i :class="[iconFor(n.type), 'text-primary-500']" />
              <div class="notif-content">
                <span class="font-semibold text-sm">{{ n.title }}</span>
                <span class="text-color-secondary text-xs">{{ n.description }}</span>
                <small class="text-xs" style="color:var(--p-surface-400)">{{ formatTime(n.createdAt) }}</small>
              </div>
            </li>
          </ul>
        </div>
      </Popover>

      <Popover ref="profilePopover">
        <div class="profile-panel">
          <div class="flex align-items-center gap-3 pb-3 mb-2" style="border-bottom:1px solid var(--p-surface-200)">
            <Avatar :label="userInitials" shape="circle" size="large" style="background:var(--p-primary-100);color:var(--p-primary-700)" />
            <div>
              <p class="m-0 font-semibold text-sm">{{ userName }}</p>
              <p class="m-0 text-xs text-color-secondary">{{ userEmail }}</p>
            </div>
          </div>
          <div class="flex flex-column gap-1">
            <Button
              label="Estabelecimento"
              icon="pi pi-building"
              text
              fluid
              class="text-left justify-content-start"
              @click="profilePopover?.hide(); navigateTo('/configuracoes/estabelecimento')"
            />
            <Button
              label="Sair"
              icon="pi pi-sign-out"
              text
              fluid
              severity="danger"
              class="text-left justify-content-start"
              @click="logout"
            />
          </div>
        </div>
      </Popover>

      <Button
        text
        rounded
        class="p-0"
        aria-label="Perfil"
        @click="openProfile"
        :pt="{ root: { style: 'width:36px;height:36px' } }"
      >
        <Avatar :label="userInitials" shape="circle" style="background:var(--p-primary-100);color:var(--p-primary-700)" />
      </Button>
    </div>
  </header>
</template>

<script setup lang="ts">
import Avatar from 'primevue/avatar';
import Badge from 'primevue/badge';
import Button from 'primevue/button';
import Divider from 'primevue/divider';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Popover from 'primevue/popover';
import ProgressSpinner from 'primevue/progressspinner';
import type { Notification } from '../composables/useNotifications';

defineProps<{ showMenuButton?: boolean }>();
defineEmits<{ (e: 'toggle-menu'): void }>();

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const { isDark, toggle } = useTheme();
const { items, loading, unseenCount, fetchNotifications, markAllSeen: doMarkSeen, startPolling } =
  useNotifications();

const notifPopover = ref<InstanceType<typeof Popover> | null>(null);
const profilePopover = ref<InstanceType<typeof Popover> | null>(null);
const searchQuery = ref('');

const userEmail = computed(() => user.value?.email || 'gestor@jogafacil.app');
const userName = computed(() => {
  const metaName = (user.value?.user_metadata as any)?.full_name;
  return metaName || userEmail.value.split('@')[0];
});
const userInitials = computed(() => userName.value.substring(0, 1).toUpperCase());

const lastSeen = useState<number>('notificationsLastSeen');
function isUnseen(n: Notification) {
  return new Date(n.createdAt).getTime() > (lastSeen.value || 0);
}

onMounted(() => startPolling(30_000));

function openNotifs(e: Event) { notifPopover.value?.toggle(e); }
function openProfile(e: Event) { profilePopover.value?.toggle(e); }
function markAllSeen() { doMarkSeen(); }

function onNotifClick(n: Notification) {
  notifPopover.value?.hide();
  if (n.type === 'pending_approval') return navigateTo('/aprovacoes');
  if (n.type === 'payment_received') return navigateTo('/financeiro');
  return navigateTo('/agenda');
}

function iconFor(type: Notification['type']) {
  if (type === 'pending_approval') return 'pi pi-clock';
  if (type === 'payment_received') return 'pi pi-wallet';
  return 'pi pi-calendar';
}

function formatTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Agora';
  if (m < 60) return `Há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Há ${h}h`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

function onSearch() {
  if (!searchQuery.value.trim()) return;
  navigateTo(`/agenda?q=${encodeURIComponent(searchQuery.value.trim())}`);
}

async function logout() {
  profilePopover.value?.hide();
  await supabase.auth.signOut();
  await navigateTo('/login');
}

void fetchNotifications;
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  height: 60px;
  padding: 0 1rem;
  background: var(--p-surface-0);
  border-bottom: 1px solid var(--p-surface-200);
  position: sticky;
  top: 0;
  z-index: 30;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 220px;
}

.menu-btn { display: none; }

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: var(--p-text-color);
  font-weight: 700;
  font-size: 1rem;
}

.topbar-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.search-field {
  width: 100%;
  max-width: 440px;
}

/* Override global input styles para o search */
.search-field :deep(.p-inputtext) {
  width: 100%;
  background: var(--p-surface-100) !important;
  border-color: transparent !important;
  border-radius: 20px !important;
  padding: 0.5rem 0.85rem 0.5rem 2.25rem !important;
  font-size: 0.875rem !important;
  color: var(--p-text-color) !important;
  transition: border-color 0.15s, background 0.15s;
}

.search-field :deep(.p-inputtext:focus) {
  background: var(--p-surface-0) !important;
  border-color: var(--p-primary-400) !important;
  box-shadow: none !important;
}

.search-field :deep(.p-inputtext::placeholder) {
  color: var(--p-surface-400);
  font-size: 0.875rem;
}

.search-field :deep(.p-iconfield-left) {
  color: var(--p-surface-400);
  font-size: 0.85rem;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.notif-wrapper {
  position: relative;
  display: inline-flex;
}

.notif-badge {
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(30%, -30%);
  pointer-events: none;
}

/* Notification panel */
.notif-panel { width: 320px; }
.notif-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
}

.notif-empty {
  padding: 2rem 1rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.notif-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 340px;
  overflow-y: auto;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--p-surface-100);
  cursor: pointer;
  border-radius: 0.375rem;
  transition: background 0.12s;
}

.notif-item:last-child { border-bottom: none; }
.notif-item:hover { background: var(--p-surface-50); }
.notif-item.notif-unseen { background: color-mix(in srgb, var(--p-primary-50) 60%, transparent); }

.notif-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
}

/* Profile panel */
.profile-panel { width: 220px; }

@media (max-width: 1024px) {
  .menu-btn { display: inline-flex; }
  .brand-name { display: none; }
  .search-field { max-width: none; }
  .topbar-left { min-width: 0; }
}

@media (max-width: 640px) {
  .topbar-center { display: none; }
}
</style>
