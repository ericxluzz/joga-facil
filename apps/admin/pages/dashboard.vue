<template>
  <div>
    <h1 class="page-title">Dashboard</h1>
    <div v-if="loading" class="loading">Carregando métricas...</div>
    <div v-else class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total de arenas</div>
        <div class="kpi-value">{{ stats?.totalTenants ?? '—' }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">KYC aprovados</div>
        <div class="kpi-value">{{ stats?.approvedAccounts ?? '—' }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">KYC pendentes</div>
        <div class="kpi-value kpi-value--warn">{{ stats?.pendingAccounts ?? '—' }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Pagamentos (total)</div>
        <div class="kpi-value">{{ stats?.totalPayments ?? '—' }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">GMV (R$)</div>
        <div class="kpi-value">{{ formatBRL(stats?.gmvCents ?? 0) }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Taxa plataforma (R$)</div>
        <div class="kpi-value kpi-value--green">{{ formatBRL(stats?.platformFeeCents ?? 0) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'admin-only' });

const loading = ref(true);
const stats = ref<any>(null);

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

onMounted(async () => {
  try {
    stats.value = await $fetch('/api/admin/stats');
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.page-title { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0 0 2rem; }
.loading { color: #64748b; }
.kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.kpi-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
}
.kpi-label { font-size: 0.8125rem; font-weight: 600; color: #64748b; margin-bottom: 0.5rem; }
.kpi-value { font-size: 2rem; font-weight: 700; color: #0f172a; }
.kpi-value--warn { color: #f59e0b; }
.kpi-value--green { color: #16a34a; }
@media (max-width: 768px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
