<template>
  <div class="page">
    <header class="header">
      <h1>Minhas reservas</h1>
    </header>

    <div v-if="loading" class="list">
      <Skeleton v-for="i in 3" :key="i" height="100px" class="mb-2" />
    </div>

    <div v-else-if="bookings.length === 0" class="empty">
      <i class="pi pi-inbox"></i>
      <h2>Sem reservas ainda</h2>
      <p>Suas próximas reservas vão aparecer aqui.</p>
    </div>

    <div v-else class="list">
      <div v-for="b in bookings" :key="b.id" class="card">
        <div class="card-head">
          <strong>{{ b.tenantName }}</strong>
          <Tag :value="translateStatus(b.status).label" :severity="translateStatus(b.status).severity" />
        </div>
        <div class="card-body">
          <div class="row">
            <i class="pi pi-calendar"></i>
            <span>{{ b.date }} · {{ b.time }}</span>
          </div>
          <div class="row">
            <i class="pi pi-objects-column"></i>
            <span>{{ b.resourceName }}</span>
          </div>
          <div class="row total-row">
            <span class="amount">{{ formatBRL(b.priceCents) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
import Tag from 'primevue/tag';

const bookings = ref<any[]>([
  // Mock por enquanto
  {
    id: 'mock-1',
    tenantName: 'Society do Zé',
    date: '15/05/2026',
    time: '19:00 – 20:00',
    resourceName: 'Society 1',
    priceCents: 13000,
    status: 'confirmed',
  },
]);
const loading = ref(false);

function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function translateStatus(status: string) {
  switch (status) {
    case 'confirmed': return { label: 'Confirmada', severity: 'success' };
    case 'pending_approval': return { label: 'Pendente', severity: 'warn' };
    case 'cancelled': return { label: 'Cancelada', severity: 'danger' };
    case 'no_show': return { label: 'Não compareceu', severity: 'danger' };
    default: return { label: status, severity: 'secondary' };
  }
}
</script>

<style scoped>
.page { padding-bottom: 2rem; }

.header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--p-surface-200);
}
h1 { margin: 0; font-size: 1.25rem; font-weight: 600; }

.list { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }

.card {
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 1rem;
  overflow: hidden;
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--p-surface-100);
}
.card-head strong { font-size: 0.95rem; }
.card-body { padding: 0.875rem 1.25rem; }

.row {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.25rem 0;
  font-size: 0.9rem;
  color: var(--p-text-color);
}
.row i { color: var(--p-text-color-secondary); }
.total-row { justify-content: flex-end; padding-top: 0.5rem; }
.amount { font-weight: 700; color: var(--p-primary-700); font-size: 1.05rem; }

.empty {
  padding: 5rem 1.5rem;
  text-align: center;
  color: var(--p-text-color-secondary);
}
.empty i { font-size: 3rem; color: var(--p-surface-400); display: block; margin-bottom: 1rem; }
.empty h2 { font-size: 1.15rem; margin: 0 0 0.25rem; color: var(--p-text-color); }
.empty p { font-size: 0.9rem; margin: 0; }

.mb-2 { margin-bottom: 0.5rem; }
</style>
