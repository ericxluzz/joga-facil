<template>
  <div class="dashboard">
    <header class="header">
      <div>
        <h1 class="title">Bom dia, {{ userName }}</h1>
        <p class="subtitle">Aqui está o resumo do seu estabelecimento hoje.</p>
        <div v-if="tenant" class="public-link-container">
          <i class="pi pi-globe" style="color: var(--p-primary-500)"></i>
          <span style="font-weight: 500;">Link de reservas: </span>
          <a :href="publicLink" target="_blank" class="public-link">{{ publicLink }}</a>
        </div>
      </div>
      <Button label="Copiar link" icon="pi pi-copy" outlined @click="copyLink" />
    </header>

    <div v-if="loading" class="grid-kpi">
      <Skeleton width="100%" height="120px" v-for="i in 4" :key="i" />
    </div>
    <div v-else-if="stats?.kpis" class="grid-kpi">
      <Card class="kpi-card">
        <template #content>
          <div class="kpi-header">
            <span class="kpi-label">Reservas Hoje</span>
            <i class="pi pi-calendar kpi-icon" style="color: var(--p-primary-500)"></i>
          </div>
          <div class="kpi-value">{{ stats.kpis.reservasHoje }}</div>
        </template>
      </Card>
      
      <Card class="kpi-card">
        <template #content>
          <div class="kpi-header">
            <span class="kpi-label">Faturamento Mês</span>
            <i class="pi pi-wallet kpi-icon" style="color: #F97316"></i>
          </div>
          <div class="kpi-value">
            {{ new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.kpis.faturamentoMes) }}
          </div>
          <div class="kpi-sub">{{ stats.kpis.faturamentoComparacao }}</div>
        </template>
      </Card>

      <Card class="kpi-card">
        <template #content>
          <div class="kpi-header">
            <span class="kpi-label">Ocupação Semana</span>
            <i class="pi pi-chart-line kpi-icon" style="color: #3B82F6"></i>
          </div>
          <div class="kpi-value">{{ stats.kpis.ocupacaoSemana }}%</div>
        </template>
      </Card>

      <Card class="kpi-card">
        <template #content>
          <div class="kpi-header">
            <span class="kpi-label">Aprovações Pendentes</span>
            <i class="pi pi-clock kpi-icon" style="color: #F59E0B"></i>
          </div>
          <div class="kpi-value">{{ stats.kpis.aprovacoesPendentes }}</div>
        </template>
      </Card>
    </div>

    <div class="grid-main mt-2">
      <!-- Tabela de Próximas Reservas -->
      <Card class="table-card">
        <template #title>Próximas Reservas</template>
        <template #content>
          <div v-if="loading">
            <Skeleton width="100%" height="40px" class="mb-2" v-for="i in 5" :key="i" />
          </div>
          <DataTable v-else :value="stats?.proximasReservas" stripedRows>
            <Column field="cliente" header="Cliente" />
            <Column field="quadra" header="Quadra" />
            <Column field="dataHora" header="Data/Hora" />
            <Column header="Status">
              <template #body="slotProps">
                <Tag :value="translateStatus(slotProps.data.status).label" :severity="translateStatus(slotProps.data.status).severity" />
              </template>
            </Column>
            <Column header="Valor">
              <template #body="slotProps">
                {{ new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(slotProps.data.valor) }}
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>

      <!-- Gráfico e Feed -->
      <div class="side-col">
        <Card class="chart-card mb-2">
          <template #title>Ocupação da Semana</template>
          <template #content>
            <div v-if="loading">
              <Skeleton width="100%" height="200px" />
            </div>
            <div v-else class="bar-chart">
              <div v-for="(val, i) in stats?.chartData?.datasets[0]?.data" :key="i" class="bar-container">
                <div class="bar-fill" :style="{ height: `${val}%`, backgroundColor: stats?.chartData?.datasets[0]?.backgroundColor }"></div>
                <div class="bar-label">{{ stats?.chartData?.labels[i] }}</div>
              </div>
            </div>
          </template>
        </Card>

        <Card class="feed-card">
          <template #title>Atividade Recente</template>
          <template #content>
            <div v-if="loading">
              <Skeleton width="100%" height="60px" class="mb-2" v-for="i in 4" :key="i" />
            </div>
            <Timeline v-else :value="stats?.timeline" class="custom-timeline">
              <template #marker="slotProps">
                <span class="timeline-marker" :style="{ backgroundColor: slotProps.item.color }">
                  <i :class="slotProps.item.icon" style="color: white; font-size: 0.75rem;"></i>
                </span>
              </template>
              <template #content="slotProps">
                <div class="timeline-content">
                  <span class="timeline-title">{{ slotProps.item.titulo }}</span>
                  <span class="timeline-detail">{{ slotProps.item.detalhe }}</span>
                  <span class="timeline-time">{{ slotProps.item.tempo }}</span>
                </div>
              </template>
            </Timeline>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Timeline from 'primevue/timeline';
import Skeleton from 'primevue/skeleton';

definePageMeta({ layout: 'default' });

const user = useSupabaseUser();
const userName = computed(() => {
  const metaName = user.value?.user_metadata?.full_name;
  if (metaName) return metaName.split(' ')[0];
  return user.value?.email?.split('@')[0] ?? 'Gestor';
});

const { stats, loading, fetchStats } = useDashboardStats();
const { tenant, fetchTenant } = useTenant();

onMounted(() => {
  fetchStats();
  fetchTenant();
});

const publicLink = computed(() => {
  const slug = tenant.value?.slug || 'meu-society';
  return `${useRuntimeConfig().public.clientUrl}/r/${slug}`;
});

const translateStatus = (status: string) => {
  switch (status) {
    case 'confirmed': return { label: 'Confirmada', severity: 'success' };
    case 'pending_approval': return { label: 'Pendente', severity: 'warn' };
    case 'hold': return { label: 'No Carrinho', severity: 'secondary' };
    case 'cancelled': return { label: 'Cancelada', severity: 'danger' };
    default: return { label: status, severity: 'info' };
  }
};

const toast = useToast?.();
async function copyLink() {
  await navigator.clipboard.writeText(publicLink.value);
  try {
    toast?.add?.({ severity: 'success', summary: 'Copiado!', detail: 'Link público copiado', life: 2000 });
  } catch {
    alert('Link copiado: ' + publicLink.value);
  }
}
</script>

<style scoped>
.dashboard {
  width: 100%;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}
.title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--p-text-color);
}
.subtitle {
  margin: 0.25rem 0 0;
  color: var(--p-text-color-secondary);
  font-size: 0.9rem;
}
.public-link-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  font-size: 0.85rem;
  background: var(--p-primary-50);
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  border: 1px dashed var(--p-primary-200);
  width: fit-content;
}
.public-link {
  color: var(--p-primary-700);
  text-decoration: none;
  font-weight: 600;
  transition: opacity 0.2s;
}
.public-link:hover {
  opacity: 0.85;
  text-decoration: underline;
}

.grid-kpi {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}
.kpi-card :deep(.p-card-body) {
  padding: 1.25rem;
}
.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.kpi-label {
  font-size: 0.85rem;
  color: var(--p-text-color-secondary);
}
.kpi-icon {
  font-size: 1.25rem;
}
.kpi-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--p-text-color);
}
.kpi-sub {
  font-size: 0.75rem;
  color: var(--p-primary-500);
  margin-top: 0.25rem;
  font-weight: 500;
}

.mt-2 { margin-top: 1rem; }
.mb-2 { margin-bottom: 1rem; }

.grid-main {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
}

/* Gráfico de barras CSS */
.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 200px;
  padding-top: 1rem;
}
.bar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  width: 12%;
}
.bar-fill {
  width: 100%;
  max-width: 30px;
  border-radius: 4px 4px 0 0;
  transition: height 0.5s ease;
}
.bar-label {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--p-text-color-secondary);
}

/* Timeline Customizada */
.custom-timeline :deep(.p-timeline-event-content) {
  padding-bottom: 1.5rem;
}
.timeline-marker {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}
.timeline-content {
  display: flex;
  flex-direction: column;
  margin-left: 0.5rem;
}
.timeline-title {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--p-text-color);
}
.timeline-detail {
  font-size: 0.8rem;
  color: var(--p-text-color-secondary);
  margin-top: 0.15rem;
}
.timeline-time {
  font-size: 0.75rem;
  color: var(--p-surface-400);
  margin-top: 0.25rem;
}

@media (max-width: 1024px) {
  .grid-main {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 600px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}
</style>
