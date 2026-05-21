<template>
  <div class="aprovacoes-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Fila de Aprovações</h1>
        <p class="page-subtitle">Aprove ou recuse agendamentos com pagamento na entrega.</p>
      </div>
    </header>

    <Card class="table-card">
      <template #content>
        <div v-if="loading" class="loading-state">
          <Skeleton width="100%" height="50px" class="mb-2" v-for="i in 5" :key="i" />
        </div>
        <div v-else-if="pendingBookings.length === 0" class="empty-state">
          <i class="pi pi-check-circle empty-icon"></i>
          <h3>Tudo em dia!</h3>
          <p>Não há novas solicitações aguardando aprovação.</p>
        </div>
        <DataTable v-else :value="pendingBookings" stripedRows class="custom-table">
          <Column field="customerName" header="Cliente">
            <template #body="slotProps">
              <div class="customer-info">
                <span class="customer-name">{{ slotProps.data.customerName }}</span>
                <span class="customer-phone">{{ slotProps.data.customerPhone }}</span>
              </div>
            </template>
          </Column>
          <Column field="resourceName" header="Quadra" />
          <Column header="Horário">
            <template #body="slotProps">
              <div class="time-info">
                <span class="date">{{ formatDate(slotProps.data.date) }}</span>
                <span class="time">{{ slotProps.data.startTime }} - {{ slotProps.data.endTime }}</span>
              </div>
            </template>
          </Column>
          <Column header="Valor">
            <template #body="slotProps">
              <span class="price">
                {{ new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(slotProps.data.priceCents / 100) }}
              </span>
            </template>
          </Column>
          <Column header="Ações" class="actions-column">
            <template #body="slotProps">
              <div class="action-buttons">
                <Button 
                  icon="pi pi-check" 
                  severity="success" 
                  outlined 
                  rounded 
                  v-tooltip.top="'Aprovar'"
                  @click="approveBooking(slotProps.data.id)"
                  :loading="actionLoadingId === slotProps.data.id"
                />
                <Button 
                  icon="pi pi-times" 
                  severity="danger" 
                  outlined 
                  rounded 
                  v-tooltip.top="'Recusar'"
                  @click="cancelBooking(slotProps.data.id)"
                  :loading="actionLoadingId === slotProps.data.id"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Skeleton from 'primevue/skeleton';

definePageMeta({ layout: 'default' });

const bookings = ref<any[]>([]);
const pendingBookings = ref<any[]>([]);
const loading = ref(true);
const actionLoadingId = ref<string | null>(null);

async function loadBookings() {
  loading.value = true;
  try {
    const data = await $fetch<any>('/api/bookings?status=pending_approval');
    bookings.value = data.bookings || [];
    pendingBookings.value = bookings.value;
  } catch (err) {
    console.error('Erro ao carregar reservas:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadBookings();
});

async function approveBooking(id: string) {
  actionLoadingId.value = id;
  try {
    await $fetch(`/api/bookings/${id}/approve`, { method: 'PATCH' });
    // Remove localmente após aprovar
    pendingBookings.value = pendingBookings.value.filter(b => b.id !== id);
  } catch (err) {
    console.error('Erro ao aprovar:', err);
  } finally {
    actionLoadingId.value = null;
  }
}

async function cancelBooking(id: string) {
  actionLoadingId.value = id;
  try {
    await $fetch(`/api/bookings/${id}/cancel`, { method: 'PATCH' });
    // Remove localmente após recusar
    pendingBookings.value = pendingBookings.value.filter(b => b.id !== id);
  } catch (err) {
    console.error('Erro ao recusar:', err);
  } finally {
    actionLoadingId.value = null;
  }
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}
</script>

<style scoped>
.aprovacoes-page {
  width: 100%;
}
.page-header {
  margin-bottom: 2rem;
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

.table-card :deep(.p-card-body) {
  padding: 1.5rem;
}

.customer-info {
  display: flex;
  flex-direction: column;
}
.customer-name {
  font-weight: 600;
  color: var(--p-text-color);
}
.customer-phone {
  font-size: 0.8rem;
  color: var(--p-text-color-secondary);
}

.time-info {
  display: flex;
  flex-direction: column;
}
.date {
  font-weight: 500;
  font-size: 0.9rem;
}
.time {
  font-size: 0.8rem;
  color: var(--p-primary-500);
  font-weight: 600;
}

.price {
  font-weight: 600;
  color: var(--p-text-color);
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  text-align: center;
  color: var(--p-text-color-secondary);
}
.empty-icon {
  font-size: 3rem;
  color: var(--p-primary-400);
  margin-bottom: 1rem;
}
.empty-state h3 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--p-text-color);
}
.empty-state p {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
}

.mb-2 { margin-bottom: 0.5rem; }

@media (max-width: 768px) {
  .page-header { margin-bottom: 1rem; }
  .table-card :deep(.p-datatable-tbody td),
  .table-card :deep(.p-datatable-thead th) {
    font-size: 0.8rem;
    padding: 0.5rem;
  }
}
</style>
