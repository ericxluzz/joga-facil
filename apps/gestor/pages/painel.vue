<template>
  <div class="painel">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ greeting }}, {{ userName }} 👋</h1>
        <p class="page-sub">{{ todayLabel }}</p>
      </div>
      <div class="header-actions">
        <CopyLinkButton v-if="publicLink" :url="publicLink" :label="`/${data?.tenant?.slug || ''}`" />
        <button class="btn-primary" @click="navigateTo('/agenda')">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
          Nova reserva
        </button>
      </div>
    </div>

    <!-- Alerta de aprovações -->
    <div v-if="(data?.pendingApprovalsCount || 0) > 0" class="alert-banner">
      <div class="alert-icon">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
      </div>
      <span><strong>{{ data?.pendingApprovalsCount }}</strong> reserva{{ (data?.pendingApprovalsCount || 0) > 1 ? 's' : '' }} aguardando aprovação</span>
      <button class="alert-action" @click="navigateTo('/aprovacoes')">Revisar agora →</button>
    </div>

    <!-- KPI Cards -->
    <div v-if="pending" class="kpi-grid">
      <div v-for="i in 4" :key="i" class="kpi-card skeleton" />
    </div>
    <div v-else class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-top">
          <span class="kpi-label">Faturamento hoje</span>
          <div class="kpi-icon kpi-icon--green">
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"/></svg>
          </div>
        </div>
        <div class="kpi-value">{{ formatBRL(data?.todayPaymentsTotalCents || 0) }}</div>
        <div class="kpi-detail">{{ data?.todayPayments?.length || 0 }} pagamentos confirmados</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-top">
          <span class="kpi-label">Reservas hoje</span>
          <div class="kpi-icon kpi-icon--blue">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
          </div>
        </div>
        <div class="kpi-value">{{ (data?.todayBookings || []).filter((b: any) => b.status !== 'cancelled').length }}</div>
        <div class="kpi-detail">{{ upcomingBookings.length }} próximas horas</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-top">
          <span class="kpi-label">Taxa de ocupação</span>
          <div class="kpi-icon kpi-icon--purple">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
          </div>
        </div>
        <div class="kpi-value">{{ data?.occupancy?.percentage || 0 }}<span class="kpi-unit">%</span></div>
        <div class="kpi-detail">{{ data?.occupancy?.occupiedSlots || 0 }} de {{ data?.occupancy?.totalSlots || 0 }} horários</div>
        <div class="kpi-bar">
          <div class="kpi-bar-fill" :style="{ width: `${data?.occupancy?.percentage || 0}%` }" />
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-top">
          <span class="kpi-label">Aguardando aprovação</span>
          <div class="kpi-icon kpi-icon--orange">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
          </div>
        </div>
        <div class="kpi-value">{{ data?.pendingApprovalsCount || 0 }}</div>
        <div class="kpi-detail">
          <button v-if="(data?.pendingApprovalsCount || 0) > 0" class="kpi-link" @click="navigateTo('/aprovacoes')">Revisar agora →</button>
          <span v-else>Nenhuma pendência</span>
        </div>
      </div>
    </div>

    <!-- Próximas reservas -->
    <div class="section-card">
      <div class="section-head">
        <div>
          <h2 class="section-title">Próximas reservas</h2>
          <p class="section-sub">Reservas ainda não encerradas de hoje</p>
        </div>
        <button class="btn-ghost" @click="navigateTo('/agenda')">
          Ver agenda completa
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
        </button>
      </div>

      <div v-if="pending" class="booking-list">
        <div v-for="i in 3" :key="i" class="booking-row skeleton" style="height:64px" />
      </div>

      <div v-else-if="upcomingBookings.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 48 48" fill="none"><rect x="6" y="8" width="36" height="36" rx="4" stroke="#d1d5db" stroke-width="2"/><line x1="6" y1="18" x2="42" y2="18" stroke="#d1d5db" stroke-width="2"/><line x1="16" y1="4" x2="16" y2="12" stroke="#d1d5db" stroke-width="2" stroke-linecap="round"/><line x1="32" y1="4" x2="32" y2="12" stroke="#d1d5db" stroke-width="2" stroke-linecap="round"/><circle cx="24" cy="32" r="6" stroke="#d1d5db" stroke-width="2"/><path d="M22 32l1.5 1.5L26 30" stroke="#d1d5db" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <p class="empty-title">Nenhuma reserva nas próximas horas</p>
        <p class="empty-sub">Novas reservas aparecerão aqui em tempo real.</p>
      </div>

      <div v-else class="booking-list">
        <div
          v-for="b in upcomingBookings"
          :key="b.id"
          class="booking-row"
        >
          <div class="booking-time">
            <span class="booking-hour">{{ formatTime(b.startsAt) }}</span>
            <span class="booking-dur">{{ duration(b) }}</span>
          </div>
          <div class="booking-sep" />
          <div class="booking-info">
            <span class="booking-name">{{ b.customerName }}</span>
            <div class="booking-meta">
              <span>{{ b.resourceName }}</span>
              <span>·</span>
              <span>{{ formatBRL(b.totalCents) }}</span>
            </div>
          </div>
          <div class="booking-right">
            <span class="booking-badge" :class="`badge--${statusInfo(b.status).color}`">
              {{ statusInfo(b.status).label }}
            </span>
            <button
              v-if="b.status === 'pending_approval'"
              class="btn-xs"
              @click="navigateTo('/aprovacoes')"
            >Aprovar</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' });

const user = useSupabaseUser();
const config = useRuntimeConfig();
const nuxtApp = useNuxtApp();

const { data, pending } = useFetch<any>('/api/dashboard/today', {
  key: 'dashboard-today',
  server: false,
  default: () => null,
  getCachedData: (key) => nuxtApp.payload.data[key] ?? (nuxtApp.static?.data?.[key] ?? undefined),
});

const userName = computed(() => {
  const metaName = (user.value?.user_metadata as any)?.full_name;
  if (metaName) return String(metaName).split(' ')[0];
  return user.value?.email?.split('@')[0] || 'Gestor';
});

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
});

const todayLabel = computed(() =>
  new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
);

const publicLink = computed(() => {
  const slug = data.value?.tenant?.slug;
  return slug ? `${config.public.clientUrl}/r/${slug}` : '';
});

const upcomingBookings = computed(() =>
  (data.value?.todayBookings || []).filter(
    (b: any) => new Date(b.endsAt).getTime() >= Date.now() && b.status !== 'cancelled',
  ),
);

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function duration(b: any) {
  const m = Math.round((new Date(b.endsAt).getTime() - new Date(b.startsAt).getTime()) / 60000);
  return `${m} min`;
}

function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100);
}

function statusInfo(status: string) {
  const map: Record<string, any> = {
    confirmed: { label: 'Confirmada', color: 'green' },
    pending_approval: { label: 'Aguardando', color: 'orange' },
    hold: { label: 'Carrinho', color: 'gray' },
    expired: { label: 'Expirada', color: 'red' },
    cancelled: { label: 'Cancelada', color: 'red' },
  };
  return map[status] || { label: status, color: 'gray' };
}
</script>

<style scoped>
.painel { width: 100%; display: flex; flex-direction: column; gap: 1.5rem; }

/* Header */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}
.page-title {
  margin: 0;
  font-size: 1.625rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.page-sub {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: #64748b;
  text-transform: capitalize;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.btn-primary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #0f172a;
  color: #fff;
  border: none;
  padding: 0.5625rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.btn-primary svg { width: 16px; height: 16px; }
.btn-primary:hover { background: #1e293b; }

/* Alert */
.alert-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: #92400e;
}
.alert-icon { color: #f59e0b; display: flex; }
.alert-icon svg { width: 18px; height: 18px; }
.alert-action {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #b45309;
  font-family: inherit;
}
.alert-action:hover { text-decoration: underline; }

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}
.kpi-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.kpi-card.skeleton {
  height: 120px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border: none;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.kpi-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.kpi-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #64748b;
}
.kpi-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.kpi-icon svg { width: 16px; height: 16px; }
.kpi-icon--green { background: #dcfce7; color: #16a34a; }
.kpi-icon--blue  { background: #dbeafe; color: #2563eb; }
.kpi-icon--purple{ background: #ede9fe; color: #7c3aed; }
.kpi-icon--orange{ background: #fff7ed; color: #ea580c; }

.kpi-value {
  font-size: 1.875rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
  letter-spacing: -0.03em;
}
.kpi-unit {
  font-size: 1.25rem;
  font-weight: 700;
  color: #475569;
}
.kpi-detail {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 0.25rem;
}
.kpi-link {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  color: #ea580c;
  font-family: inherit;
  padding: 0;
}
.kpi-link:hover { text-decoration: underline; }
.kpi-bar {
  margin-top: 0.75rem;
  height: 4px;
  background: #f1f5f9;
  border-radius: 2px;
  overflow: hidden;
}
.kpi-bar-fill {
  height: 100%;
  background: #7c3aed;
  border-radius: 2px;
  transition: width 0.5s ease;
}

/* Section card */
.section-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  gap: 1rem;
}
.section-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  color: #0f172a;
}
.section-sub {
  margin: 0.125rem 0 0;
  font-size: 0.8125rem;
  color: #94a3b8;
}
.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background: none;
  border: 1px solid #e2e8f0;
  padding: 0.4375rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  font-family: inherit;
  text-decoration: none;
  transition: background 0.12s, border-color 0.12s;
  white-space: nowrap;
}
.btn-ghost svg { width: 14px; height: 14px; }
.btn-ghost:hover { background: #f8fafc; border-color: #cbd5e1; color: #0f172a; }
.btn-sm { padding: 0.3125rem 0.625rem; font-size: 0.75rem; }
.btn-xs {
  background: none;
  border: 1px solid #e2e8f0;
  padding: 0.25rem 0.625rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.1s;
}
.btn-xs:hover { background: #f1f5f9; }

/* Empty state */
.empty-state {
  padding: 3rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
}
.empty-icon svg { width: 56px; height: 56px; }
.empty-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #374151;
}
.empty-sub {
  margin: 0;
  font-size: 0.875rem;
  color: #9ca3af;
}

/* Booking list */
.booking-list { display: flex; flex-direction: column; }
.booking-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1.5rem;
  border-bottom: 1px solid #f8fafc;
  transition: background 0.1s;
}
.booking-row:last-child { border-bottom: none; }
.booking-row:hover { background: #f8fafc; }
.booking-row.skeleton {
  background: linear-gradient(90deg, #f8fafc 25%, #f1f5f9 50%, #f8fafc 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border: none;
  border-bottom: 1px solid #f1f5f9;
}
.booking-time {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 56px;
}
.booking-hour {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
}
.booking-dur {
  font-size: 0.6875rem;
  color: #94a3b8;
}
.booking-sep {
  width: 1px;
  height: 36px;
  background: #e2e8f0;
  flex-shrink: 0;
}
.booking-info { flex: 1; min-width: 0; }
.booking-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #0f172a;
  display: block;
}
.booking-meta {
  display: flex;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: #64748b;
  margin-top: 0.125rem;
}
.booking-right {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-shrink: 0;
}
.booking-badge {
  padding: 0.1875rem 0.625rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}
.badge--green  { background: #dcfce7; color: #15803d; }
.badge--orange { background: #fff7ed; color: #c2410c; }
.badge--gray   { background: #f1f5f9; color: #475569; }
.badge--red    { background: #fef2f2; color: #dc2626; }

/* Link card */
.link-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.125rem 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}
.link-card-body {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}
.link-card-icon {
  width: 40px;
  height: 40px;
  background: #f1f5f9;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #475569;
}
.link-card-icon svg { width: 18px; height: 18px; }
.link-card-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #0f172a;
}
.link-card-url {
  margin: 0.125rem 0 0;
  font-size: 0.8125rem;
  color: #64748b;
  word-break: break-all;
}
.link-card-actions {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

/* Responsive */
@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .kpi-grid { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; }
  .booking-row { padding: 0.75rem 1rem; }
  .section-head { padding: 1rem; }
  .link-card { flex-direction: column; align-items: flex-start; }
}
</style>
