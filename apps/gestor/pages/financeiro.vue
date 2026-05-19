<template>
  <div class="financeiro-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Financeiro</h1>
        <p class="page-subtitle">Acompanhe pagamentos, faturamento e reembolsos.</p>
      </div>
      <div class="header-actions">
        <DatePicker v-model="dateRange" selectionMode="range" dateFormat="dd/mm/yy"
          showIcon iconDisplay="input" placeholder="Período" class="date-range" />
        <Button label="Exportar CSV" icon="pi pi-download" outlined @click="onExport" :loading="exporting" />
      </div>
    </header>

    <!-- KPIs -->
    <div v-if="loading" class="grid-kpi mb-3">
      <Skeleton width="100%" height="120px" v-for="i in 4" :key="i" />
    </div>
    <div v-else-if="summary?.kpis" class="grid-kpi mb-3">
      <Card class="kpi-card">
        <template #content>
          <div class="kpi-header">
            <span class="kpi-label">Faturamento total</span>
            <i class="pi pi-wallet kpi-icon" style="color: var(--p-primary-500)"></i>
          </div>
          <div class="kpi-value">{{ formatBRL(summary.kpis.faturamentoTotal * 100) }}</div>
        </template>
      </Card>
      <Card class="kpi-card">
        <template #content>
          <div class="kpi-header">
            <span class="kpi-label">Transações</span>
            <i class="pi pi-receipt kpi-icon" style="color: #3B82F6"></i>
          </div>
          <div class="kpi-value">{{ summary.kpis.transacoes }}</div>
        </template>
      </Card>
      <Card class="kpi-card">
        <template #content>
          <div class="kpi-header">
            <span class="kpi-label">Ticket médio</span>
            <i class="pi pi-chart-bar kpi-icon" style="color: #F97316"></i>
          </div>
          <div class="kpi-value">{{ formatBRL(summary.kpis.ticketMedio * 100) }}</div>
        </template>
      </Card>
      <Card class="kpi-card">
        <template #content>
          <div class="kpi-header">
            <span class="kpi-label">Reembolsos</span>
            <i class="pi pi-undo kpi-icon" style="color: #EF4444"></i>
          </div>
          <div class="kpi-value">{{ formatBRL(summary.kpis.reembolsos * 100) }}</div>
        </template>
      </Card>
    </div>

    <!-- Breakdown -->
    <div v-if="summary?.breakdown" class="breakdown-card mb-3">
      <Card>
        <template #title>Forma de pagamento</template>
        <template #content>
          <div class="breakdown-list">
            <div v-for="b in summary.breakdown" :key="b.method" class="breakdown-row">
              <div class="breakdown-bar-container">
                <span class="breakdown-label">
                  <span class="dot" :style="{ background: b.color }"></span>
                  {{ b.method }}
                </span>
                <div class="breakdown-bar">
                  <div class="breakdown-fill" :style="{ width: barWidth(b.amountCents) + '%', background: b.color }"></div>
                </div>
              </div>
              <div class="breakdown-meta">
                <strong>{{ formatBRL(b.amountCents) }}</strong>
                <span>{{ b.count }} transações</span>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Tabela de pagamentos -->
    <Card class="table-card">
      <template #title>
        <div class="table-header">
          <span>Pagamentos</span>
          <SelectButton v-model="statusFilter" :options="statusOptions"
            optionLabel="label" optionValue="value" />
        </div>
      </template>
      <template #content>
        <div v-if="loadingPayments" class="loading-state">
          <Skeleton width="100%" height="50px" class="mb-2" v-for="i in 5" :key="i" />
        </div>
        <div v-else-if="filteredPayments.length === 0" class="empty-state">
          <i class="pi pi-inbox empty-icon" />
          <p>Nenhum pagamento no período selecionado.</p>
        </div>
        <DataTable v-else :value="filteredPayments" stripedRows paginator :rows="10">
          <Column field="date" header="Data" sortable />
          <Column field="customerName" header="Cliente" />
          <Column field="resourceName" header="Quadra" />
          <Column field="method" header="Método">
            <template #body="slotProps">
              <Tag :value="slotProps.data.method" severity="secondary" />
            </template>
          </Column>
          <Column header="Valor">
            <template #body="slotProps">
              <strong>{{ formatBRL(slotProps.data.amountCents) }}</strong>
            </template>
          </Column>
          <Column header="Status">
            <template #body="slotProps">
              <Tag :value="translateStatus(slotProps.data.status).label"
                :severity="translateStatus(slotProps.data.status).severity" />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Skeleton from 'primevue/skeleton';
import DatePicker from 'primevue/datepicker';
import SelectButton from 'primevue/selectbutton';

definePageMeta({ layout: 'default' });

const { summary, payments, loading, fetchSummary, fetchPayments, exportCsv } = useFinanceiro();
const loadingPayments = ref(false);
const exporting = ref(false);

const dateRange = ref<Date[] | null>(null);
const statusFilter = ref('all');
const statusOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Pagos', value: 'paid' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Reembolsados', value: 'refunded' },
];

onMounted(async () => {
  await Promise.all([fetchSummary(), fetchPayments()]);
});

watch(dateRange, async (val) => {
  if (val && val[0] && val[1]) {
    const from = formatDateISO(val[0]);
    const to = formatDateISO(val[1]);
    await Promise.all([fetchSummary({ from, to }), fetchPayments({ from, to })]);
  }
});

const filteredPayments = computed(() => {
  if (statusFilter.value === 'all') return payments.value;
  return payments.value.filter((p) => p.status === statusFilter.value);
});

const maxAmount = computed(() =>
  Math.max(...(summary.value?.breakdown || []).map((b: any) => b.amountCents), 1),
);
function barWidth(cents: number) {
  return (cents / maxAmount.value) * 100;
}

const toast = useToast?.();
async function onExport() {
  exporting.value = true;
  try {
    await exportCsv();
    toast?.add?.({ severity: 'success', summary: 'Exportado!', life: 2000 });
  } catch (err) {
    toast?.add?.({ severity: 'error', summary: 'Erro ao exportar', life: 3000 });
  } finally {
    exporting.value = false;
  }
}

function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatDateISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function translateStatus(status: string) {
  switch (status) {
    case 'paid': return { label: 'Pago', severity: 'success' };
    case 'pending': return { label: 'Pendente', severity: 'warn' };
    case 'expired': return { label: 'Expirado', severity: 'secondary' };
    case 'refunded': return { label: 'Reembolsado', severity: 'info' };
    case 'failed': return { label: 'Falhou', severity: 'danger' };
    default: return { label: status, severity: 'secondary' };
  }
}
</script>

<style scoped>
.financeiro-page { width: 100%; }
.page-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 2rem; gap: 1rem; flex-wrap: wrap;
}
.page-title { margin: 0; font-size: 1.5rem; font-weight: 700; color: var(--p-text-color); }
.page-subtitle { margin: 0.25rem 0 0; color: var(--p-text-color-secondary); font-size: 0.9rem; }
.header-actions { display: flex; gap: 0.5rem; align-items: center; }

.grid-kpi {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}
.kpi-card :deep(.p-card-body) { padding: 1.25rem; }
.kpi-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.kpi-label { font-size: 0.85rem; color: var(--p-text-color-secondary); }
.kpi-icon { font-size: 1.25rem; }
.kpi-value { font-size: 1.75rem; font-weight: 700; color: var(--p-text-color); }

.breakdown-card :deep(.p-card-body) { padding: 1.5rem; }
.breakdown-list { display: flex; flex-direction: column; gap: 1rem; }
.breakdown-row {
  display: grid; grid-template-columns: 1fr auto; gap: 1.5rem; align-items: center;
}
.breakdown-bar-container { display: flex; flex-direction: column; gap: 0.5rem; }
.breakdown-label {
  display: flex; align-items: center; gap: 0.5rem;
  font-weight: 500; font-size: 0.9rem; color: var(--p-text-color);
}
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.breakdown-bar {
  height: 8px; background: var(--p-surface-100); border-radius: 4px; overflow: hidden;
}
.breakdown-fill { height: 100%; transition: width 0.5s ease; }
.breakdown-meta { display: flex; flex-direction: column; align-items: flex-end; }
.breakdown-meta strong { font-size: 0.95rem; }
.breakdown-meta span { font-size: 0.75rem; color: var(--p-text-color-secondary); }

.table-card :deep(.p-card-body) { padding: 1.5rem; }
.table-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }

.empty-state {
  padding: 3rem 1rem; text-align: center; color: var(--p-text-color-secondary);
}
.empty-icon { font-size: 2rem; color: var(--p-surface-400); display: block; margin-bottom: 0.5rem; }

.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 1.5rem; }

@media (max-width: 768px) {
  .breakdown-row { grid-template-columns: 1fr; }
}
</style>
