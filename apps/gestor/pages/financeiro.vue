<template>
  <div class="financeiro-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Financeiro</h1>
        <p class="page-subtitle">
          Acompanhe pagamentos, faturamento e movimentações no período.
        </p>
      </div>
      <div class="header-actions">
        <DatePicker
          v-model="dateRange"
          selectionMode="range"
          dateFormat="dd/mm/yy"
          showIcon
          iconDisplay="input"
          placeholder="Período"
          class="date-range"
        />
        <Button
          label="Exportar CSV"
          icon="pi pi-download"
          outlined
          @click="onExport"
          :loading="exporting"
        />
      </div>
    </header>

    <SectionSkeleton v-if="loading" variant="kpi" :count="4" />

    <div v-else class="grid">
      <div class="col-12 md:col-6 lg:col-3">
        <Card>
          <template #content>
            <div class="text-xs font-semibold uppercase text-color-secondary mb-2">
              <i class="pi pi-wallet mr-1" />Faturamento total
            </div>
            <div class="text-3xl font-bold mb-1">{{ formatBRL((summary?.kpis?.faturamentoTotal || 0) * 100) }}</div>
            <div class="text-sm text-color-secondary">{{ summary?.kpis?.transacoes || 0 }} transações</div>
          </template>
        </Card>
      </div>
      <div class="col-12 md:col-6 lg:col-3">
        <Card>
          <template #content>
            <div class="text-xs font-semibold uppercase text-color-secondary mb-2">
              <i class="pi pi-chart-bar mr-1" />Ticket médio
            </div>
            <div class="text-3xl font-bold">{{ formatBRL((summary?.kpis?.ticketMedio || 0) * 100) }}</div>
          </template>
        </Card>
      </div>
      <div class="col-12 md:col-6 lg:col-3">
        <Card>
          <template #content>
            <div class="text-xs font-semibold uppercase text-color-secondary mb-2">
              <i class="pi pi-clock mr-1" />Pendentes
            </div>
            <div class="text-3xl font-bold">{{ formatBRL((summary?.kpis?.pendentes || 0) * 100) }}</div>
          </template>
        </Card>
      </div>
      <div class="col-12 md:col-6 lg:col-3">
        <Card>
          <template #content>
            <div class="text-xs font-semibold uppercase text-color-secondary mb-2">
              <i class="pi pi-undo mr-1" />Reembolsos
            </div>
            <div class="text-3xl font-bold">{{ formatBRL((summary?.kpis?.reembolsos || 0) * 100) }}</div>
          </template>
        </Card>
      </div>
    </div>

    <div class="grid">
      <div class="col-12 lg:col-8">
        <Card>
          <template #title>
            <div class="flex justify-content-between align-items-center">
              <span>Faturamento dia a dia</span>
              <small class="text-color-secondary font-normal text-sm">{{ summary?.period?.from }} → {{ summary?.period?.to }}</small>
            </div>
          </template>
          <template #content>
            <SectionSkeleton v-if="loading" variant="chart" :height="240" />
            <ChartCanvas v-else-if="areaChartConfig" :config="areaChartConfig" :height="240" />
          </template>
        </Card>
      </div>
      <div class="col-12 lg:col-4">
        <Card>
          <template #title>Por método de pagamento</template>
          <template #content>
            <SectionSkeleton v-if="loading" variant="chart" :height="240" />
            <ChartCanvas v-else-if="donutChartConfig" :config="donutChartConfig" :height="240" />
          </template>
        </Card>
      </div>
    </div>

    <Card>
      <template #title>Top 5 quadras por receita</template>
      <template #content>
        <SectionSkeleton v-if="loading" variant="chart" :height="180" />
        <div v-else-if="(summary?.resourceBreakdown?.length || 0) === 0" class="flex flex-column align-items-center gap-2 py-4 text-color-secondary">
          <i class="pi pi-objects-column text-3xl" />
          <span class="text-sm">Sem receita por quadra no período.</span>
        </div>
        <ChartCanvas v-else-if="resourceChartConfig" :config="resourceChartConfig" :height="220" />
      </template>
    </Card>

    <Card>
      <template #title>
        <div class="flex align-items-center justify-content-between flex-wrap gap-2">
          <span>Pagamentos recebidos</span>
          <SelectButton
            v-model="statusFilter"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            :allowEmpty="false"
            size="small"
          />
        </div>
      </template>
      <template #content>

      <SectionSkeleton v-if="loadingPayments" variant="list" :count="5" />
      <div v-else-if="filteredPayments.length === 0" class="empty-state">
        <i class="pi pi-inbox" />
        <span>Nenhum pagamento no período selecionado.</span>
      </div>
      <DataTable
        v-else
        :value="filteredPayments"
        stripedRows
        paginator
        :rows="10"
        class="payments-table"
      >
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
            <Tag
              :value="translateStatus(slotProps.data.status).label"
              :severity="translateStatus(slotProps.data.status).severity"
            />
          </template>
        </Column>
      </DataTable>
      </template>
    </Card>

    <!-- ── Wallet / Balance ──────────────────────────────────────────── -->
    <div class="grid">
      <div class="col-12 md:col-6 lg:col-4">
        <Card>
          <template #title>
            <div class="flex align-items-center gap-2">
              <i class="pi pi-wallet text-primary-500" />
              <span>Saldo disponível</span>
            </div>
          </template>
          <template #content>
            <div v-if="loadingBalance" class="flex align-items-center gap-2 text-color-secondary">
              <i class="pi pi-spin pi-spinner" /> Carregando…
            </div>
            <div v-else-if="!balance?.kycApproved" class="text-sm text-color-secondary">
              <i class="pi pi-lock mr-1" />
              Complete o <NuxtLink to="/configuracoes/recebimentos" class="text-primary-500">cadastro KYC</NuxtLink> para ver o saldo.
            </div>
            <template v-else>
              <div class="text-4xl font-bold mb-1">{{ formatBRL(balance?.availableCents ?? 0) }}</div>
              <div class="text-sm text-color-secondary mb-3">
                Pendente: {{ formatBRL(balance?.pendingCents ?? 0) }}
              </div>
              <Button label="Solicitar saque" icon="pi pi-arrow-up-right" size="small" @click="openWithdrawModal" />
            </template>
          </template>
        </Card>
      </div>
    </div>

    <!-- ── Withdrawals history ─────────────────────────────────────── -->
    <Card>
      <template #title>
        <div class="flex align-items-center justify-content-between">
          <span><i class="pi pi-arrow-circle-down mr-2 text-primary-500" />Histórico de saques</span>
          <Button icon="pi pi-refresh" text rounded size="small" @click="refreshWithdrawals" :loading="loadingWithdrawals" />
        </div>
      </template>
      <template #content>
        <div v-if="loadingWithdrawals" class="empty-state"><i class="pi pi-spin pi-spinner" /></div>
        <div v-else-if="!withdrawals?.length" class="empty-state">
          <i class="pi pi-inbox" />
          <span>Nenhum saque solicitado ainda.</span>
        </div>
        <DataTable v-else :value="withdrawals" stripedRows :rows="10" paginator>
          <Column field="requestedAt" header="Data" sortable>
            <template #body="sp">{{ formatDate(sp.data.requestedAt) }}</template>
          </Column>
          <Column header="Valor">
            <template #body="sp"><strong>{{ formatBRL(sp.data.amountCents) }}</strong></template>
          </Column>
          <Column field="status" header="Status">
            <template #body="sp">
              <Tag
                :value="withdrawalStatusLabel(sp.data.status)"
                :severity="withdrawalStatusSeverity(sp.data.status)"
              />
            </template>
          </Column>
          <Column field="failureReason" header="Motivo" />
        </DataTable>
      </template>
    </Card>

    <!-- ── Withdrawal modal ───────────────────────────────────────── -->
    <Dialog v-model:visible="withdrawModalOpen" modal header="Solicitar saque" :style="{ width: '400px' }">
      <div class="flex flex-column gap-3">
        <div class="text-sm text-color-secondary">
          Saldo disponível: <strong>{{ formatBRL(balance?.availableCents ?? 0) }}</strong>
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1">Valor do saque (R$)</label>
          <InputNumber
            v-model="withdrawAmount"
            mode="currency"
            currency="BRL"
            locale="pt-BR"
            :min="1"
            :max="(balance?.availableCents ?? 0) / 100"
            class="w-full"
          />
        </div>
        <div v-if="withdrawError" class="text-sm" style="color: #ef4444;">{{ withdrawError }}</div>
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="withdrawModalOpen = false" />
        <Button
          label="Confirmar saque"
          icon="pi pi-check"
          :loading="submittingWithdraw"
          :disabled="!withdrawAmount || withdrawAmount <= 0"
          @click="submitWithdraw"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import Card from 'primevue/card';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import DatePicker from 'primevue/datepicker';
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber';
import SelectButton from 'primevue/selectbutton';
import Tag from 'primevue/tag';
import type { ChartConfiguration } from 'chart.js';

definePageMeta({ layout: 'default' });

const { summary, payments, loading, fetchSummary, fetchPayments, exportCsv } = useFinanceiro();
const { isDark } = useTheme();
const loadingPayments = ref(false);
const exporting = ref(false);

// ── Wallet ─────────────────────────────────────────────────────────────────
const loadingBalance = ref(false);
const loadingWithdrawals = ref(false);
const balance = ref<{ availableCents: number; pendingCents: number; kycApproved: boolean } | null>(null);
const withdrawals = ref<any[]>([]);
const withdrawModalOpen = ref(false);
const withdrawAmount = ref<number | null>(null);
const withdrawError = ref('');
const submittingWithdraw = ref(false);

async function fetchBalance() {
  loadingBalance.value = true;
  try {
    balance.value = await $fetch<any>('/api/wallet/balance');
  } catch {
    balance.value = null;
  } finally {
    loadingBalance.value = false;
  }
}

async function refreshWithdrawals() {
  loadingWithdrawals.value = true;
  try {
    const res = await $fetch<{ withdrawals: any[] }>('/api/wallet/withdrawals');
    withdrawals.value = res.withdrawals;
  } catch {
    withdrawals.value = [];
  } finally {
    loadingWithdrawals.value = false;
  }
}

function openWithdrawModal() {
  withdrawAmount.value = null;
  withdrawError.value = '';
  withdrawModalOpen.value = true;
}

async function submitWithdraw() {
  if (!withdrawAmount.value || withdrawAmount.value <= 0) return;
  submittingWithdraw.value = true;
  withdrawError.value = '';
  try {
    await $fetch('/api/wallet/withdrawals', {
      method: 'POST',
      body: { amountCents: Math.round(withdrawAmount.value * 100) },
    });
    withdrawModalOpen.value = false;
    await Promise.all([fetchBalance(), refreshWithdrawals()]);
  } catch (e: any) {
    withdrawError.value = e?.data?.message || 'Erro ao solicitar saque.';
  } finally {
    submittingWithdraw.value = false;
  }
}

function withdrawalStatusLabel(s: string) {
  const map: Record<string, string> = {
    requested: 'Solicitado',
    processing: 'Processando',
    completed: 'Concluído',
    failed: 'Falhou',
    cancelled: 'Cancelado',
  };
  return map[s] || s;
}

function withdrawalStatusSeverity(s: string): string {
  const map: Record<string, string> = {
    requested: 'info',
    processing: 'warn',
    completed: 'success',
    failed: 'danger',
    cancelled: 'secondary',
  };
  return map[s] || 'secondary';
}

function formatDate(iso: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function chartGridColor() {
  return isDark.value ? 'rgba(51, 65, 85, 0.6)' : 'rgba(148, 163, 184, 0.2)';
}

function chartTextColor() {
  return isDark.value ? '#94A3B8' : '#64748B';
}

function chartEmptyColor() {
  return isDark.value ? '#334155' : '#e2e8f0';
}

const dateRange = ref<Date[] | null>(null);
const statusFilter = ref('all');
const statusOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Pagos', value: 'paid' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Reembolsados', value: 'refunded' },
];

onMounted(async () => {
  await Promise.all([fetchSummary(), fetchPayments(), fetchBalance(), refreshWithdrawals()]);
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
  return payments.value.filter((p: any) => p.status === statusFilter.value);
});

const areaChartConfig = computed<ChartConfiguration | null>(() => {
  if (!summary.value?.chartData) return null;
  const labels = (summary.value.chartData.labels || []).map((d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
  );
  const values = summary.value.chartData.values || [];
  const textColor = chartTextColor();
  return {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Faturamento (R$)',
          data: values,
          borderColor: '#10B981',
          backgroundColor: isDark.value ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.15)',
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: '#10B981',
          borderWidth: 2,
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                Number(ctx.parsed.y) || 0,
              ),
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: textColor,
            callback: (v) =>
              new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                maximumFractionDigits: 0,
              }).format(Number(v) || 0),
          },
          grid: { color: chartGridColor() },
        },
      },
    },
  };
});

const donutChartConfig = computed<ChartConfiguration | null>(() => {
  if (!summary.value?.breakdown) return null;
  const data = summary.value.breakdown.filter((b: any) => b.amountCents > 0);
  const legendColor = chartTextColor();
  if (data.length === 0) {
    return {
      type: 'doughnut',
      data: {
        labels: ['Sem dados'],
        datasets: [{ data: [1], backgroundColor: [chartEmptyColor()], borderWidth: 0 }],
      },
      options: { cutout: '65%', plugins: { legend: { display: false } } },
    };
  }
  return {
    type: 'doughnut',
    data: {
      labels: data.map((d: any) => d.method),
      datasets: [
        {
          data: data.map((d: any) => d.amountCents / 100),
          backgroundColor: data.map((d: any) => d.color),
          borderWidth: 0,
        },
      ],
    },
    options: {
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 11 }, color: legendColor },
        },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${ctx.label}: ${new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(Number(ctx.parsed) || 0)}`,
          },
        },
      },
    },
  };
});

const resourceChartConfig = computed<ChartConfiguration | null>(() => {
  if (!summary.value?.resourceBreakdown?.length) return null;
  const textColor = chartTextColor();
  return {
    type: 'bar',
    data: {
      labels: summary.value.resourceBreakdown.map((r: any) => r.name),
      datasets: [
        {
          label: 'Receita',
          data: summary.value.resourceBreakdown.map((r: any) => r.amountCents / 100),
          backgroundColor: isDark.value ? 'rgba(16, 185, 129, 0.55)' : 'rgba(16, 185, 129, 0.7)',
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            color: textColor,
            callback: (v) =>
              new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                maximumFractionDigits: 0,
              }).format(Number(v) || 0),
          },
          grid: { color: chartGridColor() },
        },
        y: {
          grid: { display: false },
          ticks: { color: textColor },
        },
      },
    },
  };
});

const toast = useToast?.();
async function onExport() {
  exporting.value = true;
  try {
    await exportCsv();
    toast?.add?.({ severity: 'success', summary: 'Exportado!', life: 2000 });
  } catch {
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
    case 'paid':
      return { label: 'Pago', severity: 'success' };
    case 'pending':
      return { label: 'Pendente', severity: 'warn' };
    case 'expired':
      return { label: 'Expirado', severity: 'secondary' };
    case 'refunded':
      return { label: 'Reembolsado', severity: 'info' };
    case 'failed':
      return { label: 'Falhou', severity: 'danger' };
    default:
      return { label: status, severity: 'secondary' };
  }
}
</script>

<style scoped>
.financeiro-page {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.page-subtitle {
  margin: 0.25rem 0 0;
  color: var(--p-text-color-secondary);
  font-size: 0.9rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.payments-table :deep(.p-datatable-tbody td) {
  font-size: 0.85rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 3rem 1rem;
  color: var(--p-text-color-secondary);
  text-align: center;
}

.empty-state i {
  font-size: 2rem;
  color: var(--p-surface-400);
}

.empty-state span {
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  .header-actions {
    flex-wrap: wrap;
  }
  .payments-table :deep(.p-datatable-tbody td),
  .payments-table :deep(.p-datatable-thead th) {
    font-size: 0.8rem;
    padding: 0.5rem 0.5rem;
  }
}
</style>
