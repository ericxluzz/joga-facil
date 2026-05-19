<template>
  <div class="agenda-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Agenda</h1>
        <p class="page-subtitle">Gerencie os horários e reservas do seu estabelecimento.</p>
      </div>
      <div class="header-actions">
        <DatePicker v-model="selectedDate" dateFormat="yy-mm-dd" showIcon iconDisplay="input" class="date-picker" />
        <Button label="Nova Reserva" icon="pi pi-plus" @click="openNewBookingDialog" />
      </div>
    </header>

    <div class="filters-bar mb-3">
      <SelectButton v-model="statusFilter" :options="statusOptions" optionLabel="label" optionValue="value" class="status-selector" />
    </div>

    <!-- Colunas da Agenda -->
    <div v-if="loading" class="grid-columns">
      <Card v-for="i in 3" :key="i" class="column-card">
        <template #content>
          <Skeleton width="60%" height="24px" class="mb-3" />
          <Skeleton width="100%" height="80px" class="mb-2" v-for="j in 3" :key="j" />
        </template>
      </Card>
    </div>
    
    <div v-else class="grid-columns">
      <Card v-for="res in resources" :key="res.id" class="column-card">
        <template #title>
          <div class="column-header">
            <span class="column-name">{{ res.name }}</span>
            <span class="column-badge">{{ getSlotsForResource(res.id).length }}</span>
          </div>
        </template>
        <template #content>
          <div class="slots-container">
            <div 
              v-for="booking in getSlotsForResource(res.id)" 
              :key="booking.id" 
              :class="['slot-card', booking.status]"
              @click="openDetailsDialog(booking)"
            >
              <div class="slot-time">
                <i class="pi pi-clock mr-1"></i>
                {{ booking.startTime }} - {{ booking.endTime }}
              </div>
              <div class="slot-customer">{{ booking.customerName }}</div>
              <div class="slot-service">{{ booking.serviceName }}</div>
            </div>
            
            <div v-if="getSlotsForResource(res.id).length === 0" class="empty-column">
              <i class="pi pi-calendar-minus mb-2" style="font-size: 1.5rem;"></i>
              <span>Sem reservas</span>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Dialog: Detalhes da Reserva -->
    <Dialog v-model:visible="detailsVisible" header="Detalhes do Agendamento" modal :style="{ width: '450px' }">
      <div v-if="activeBooking" class="details-body">
        <div class="detail-item">
          <label>Cliente</label>
          <span class="value">{{ activeBooking.customerName }}</span>
        </div>
        <div class="detail-item" v-if="activeBooking.customerPhone">
          <label>Telefone</label>
          <span class="value">{{ activeBooking.customerPhone }}</span>
        </div>
        <div class="detail-row">
          <div class="detail-item">
            <label>Quadra</label>
            <span class="value">{{ activeBooking.resourceName }}</span>
          </div>
          <div class="detail-item">
            <label>Serviço</label>
            <span class="value">{{ activeBooking.serviceName }}</span>
          </div>
        </div>
        <div class="detail-row">
          <div class="detail-item">
            <label>Horário</label>
            <span class="value highlight">{{ activeBooking.startTime }} - {{ activeBooking.endTime }}</span>
          </div>
          <div class="detail-item">
            <label>Valor</label>
            <span class="value">
              {{ new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activeBooking.priceCents / 100) }}
            </span>
          </div>
        </div>
        <div class="detail-item">
          <label>Status</label>
          <Tag :value="translateStatus(activeBooking.status).label" :severity="translateStatus(activeBooking.status).severity" />
        </div>
      </div>
      <template #footer>
        <div class="details-footer">
          <Button 
            v-if="activeBooking?.status === 'pending_approval'"
            label="Aprovar Reserva" 
            severity="success" 
            @click="approveActiveBooking"
            :loading="actionLoading"
          />
          <Button 
            v-if="activeBooking?.status !== 'cancelled'"
            label="Cancelar Horário" 
            severity="danger" 
            outlined
            @click="cancelActiveBooking"
            :loading="actionLoading"
          />
        </div>
      </template>
    </Dialog>

    <!-- Dialog: Nova Reserva Manual -->
    <Dialog v-model:visible="newVisible" header="Nova Reserva Manual" modal :style="{ width: '450px' }">
      <form @submit.prevent="saveNewBooking" class="new-form">
        <div class="field">
          <label for="new-customer">Nome do Cliente *</label>
          <InputText id="new-customer" v-model="newForm.customerName" required class="w-full" />
        </div>
        <div class="field">
          <label for="new-phone">Telefone (WhatsApp)</label>
          <InputMask id="new-phone" v-model="newForm.customerPhone" mask="(99) 99999-9999" placeholder="(11) 99999-9999" class="w-full" />
        </div>
        <div class="field">
          <label for="new-resource">Quadra *</label>
          <Select id="new-resource" v-model="newForm.resourceId" :options="resources" optionLabel="name" optionValue="id" placeholder="Selecione" class="w-full" required />
        </div>
        <div class="field-row">
          <div class="field">
            <label for="new-start">Hora Início *</label>
            <InputMask id="new-start" v-model="newForm.startTime" mask="99:99" placeholder="08:00" class="w-full" required />
          </div>
          <div class="field">
            <label for="new-end">Hora Fim *</label>
            <InputMask id="new-end" v-model="newForm.endTime" mask="99:99" placeholder="09:00" class="w-full" required />
          </div>
        </div>
        <div class="field">
          <label for="new-price">Valor (R$)</label>
          <InputNumber id="new-price" v-model="newForm.price" mode="decimal" :minFractionDigits="2" class="w-full" />
        </div>
        <div class="new-footer mt-3">
          <Button label="Cancelar" severity="secondary" outlined @click="newVisible = false" type="button" />
          <Button label="Salvar Reserva" type="submit" :loading="actionLoading" />
        </div>
      </form>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import Card from 'primevue/card';
import Skeleton from 'primevue/skeleton';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import InputText from 'primevue/inputtext';
import InputMask from 'primevue/inputmask';
import Select from 'primevue/select';
import InputNumber from 'primevue/inputnumber';

definePageMeta({ layout: 'default' });

const resources = ref<any[]>([]);
const bookings = ref<any[]>([]);
const loading = ref(true);
const actionLoading = ref(false);

const selectedDate = ref(new Date());
const statusFilter = ref('all');

const statusOptions = [
  { label: 'Todas', value: 'all' },
  { label: 'Confirmadas', value: 'confirmed' },
  { label: 'Pendentes', value: 'pending_approval' },
];

async function loadData() {
  loading.value = true;
  try {
    const formattedDate = selectedDate.value.toISOString().split('T')[0];
    const [resData, bookData] = await Promise.all([
      $fetch<any>('/api/resources'),
      $fetch<any>(`/api/bookings?date=${formattedDate}`)
    ]);
    
    resources.value = resData.resources || [];
    bookings.value = bookData.bookings || [];
  } catch (err) {
    console.error('Erro ao carregar dados da agenda:', err);
  } finally {
    loading.value = false;
  }
}

watch(selectedDate, () => {
  loadData();
});

onMounted(() => {
  loadData();
});

function getSlotsForResource(resId: string) {
  let list = bookings.value.filter(b => b.resourceId === resId);
  if (statusFilter.value !== 'all') {
    list = list.filter(b => b.status === statusFilter.value);
  }
  return list.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

// Dialog Detalhes
const detailsVisible = ref(false);
const activeBooking = ref<any>(null);

function openDetailsDialog(booking: any) {
  activeBooking.value = booking;
  detailsVisible.value = true;
}

async function approveActiveBooking() {
  if (!activeBooking.value) return;
  actionLoading.value = true;
  try {
    const res = await $fetch<any>(`/api/bookings/${activeBooking.value.id}/approve`, { method: 'PATCH' });
    if (res.success) {
      activeBooking.value.status = 'confirmed';
      loadData(); // Recarrega
      detailsVisible.value = false;
    }
  } catch (err) {
    console.error(err);
  } finally {
    actionLoading.value = false;
  }
}

async function cancelActiveBooking() {
  if (!activeBooking.value) return;
  actionLoading.value = true;
  try {
    const res = await $fetch<any>(`/api/bookings/${activeBooking.value.id}/cancel`, { method: 'PATCH' });
    if (res.success) {
      activeBooking.value.status = 'cancelled';
      loadData(); // Recarrega
      detailsVisible.value = false;
    }
  } catch (err) {
    console.error(err);
  } finally {
    actionLoading.value = false;
  }
}

// Dialog Nova Reserva
const newVisible = ref(false);
const newForm = reactive({
  customerName: '',
  customerPhone: '',
  resourceId: '',
  startTime: '',
  endTime: '',
  price: 150,
});

function openNewBookingDialog() {
  newForm.customerName = '';
  newForm.customerPhone = '';
  newForm.resourceId = resources.value[0]?.id || '';
  newForm.startTime = '';
  newForm.endTime = '';
  newForm.price = 150;
  newVisible.value = true;
}

async function saveNewBooking() {
  actionLoading.value = true;
  try {
    const formattedDate = selectedDate.value.toISOString().split('T')[0];
    const res = await $fetch<any>('/api/bookings', {
      method: 'POST',
      body: {
        customerName: newForm.customerName,
        customerPhone: newForm.customerPhone,
        resourceId: newForm.resourceId,
        startTime: newForm.startTime,
        endTime: newForm.endTime,
        date: formattedDate,
        priceCents: Math.round(newForm.price * 100),
        status: 'confirmed'
      }
    });

    if (res.success) {
      newVisible.value = false;
      loadData(); // Recarrega
    }
  } catch (err) {
    console.error(err);
  } finally {
    actionLoading.value = false;
  }
}

const translateStatus = (status: string) => {
  switch (status) {
    case 'confirmed': return { label: 'Confirmada', severity: 'success' };
    case 'pending_approval': return { label: 'Pendente', severity: 'warn' };
    case 'hold': return { label: 'No Carrinho', severity: 'secondary' };
    case 'cancelled': return { label: 'Cancelada', severity: 'danger' };
    default: return { label: status, severity: 'info' };
  }
};
</script>

<style scoped>
.agenda-page {
  width: 100%;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
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
  gap: 0.75rem;
  align-items: center;
}
:deep(.date-picker input) {
  width: 140px;
}

.filters-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mb-3 { margin-bottom: 1.5rem; }
.mr-1 { margin-right: 0.25rem; }
.mt-3 { margin-top: 1rem; }

/* Grid de colunas */
.grid-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
  align-items: start;
}
.column-card {
  min-height: 400px;
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
}
.column-card :deep(.p-card-body) {
  padding: 1.25rem;
}
.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid var(--p-primary-50);
  padding-bottom: 0.75rem;
}
.column-name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--p-text-color);
}
.column-badge {
  background: var(--p-primary-50);
  color: var(--p-primary-700);
  padding: 0.2rem 0.5rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.slots-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

/* Cards das reservas */
.slot-card {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border-left: 4px solid var(--p-surface-400);
  background: var(--p-surface-50);
  cursor: pointer;
  transition: all 0.2s ease;
}
.slot-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.slot-card.confirmed {
  border-left-color: #10B981;
  background: rgba(16, 185, 129, 0.04);
}
.slot-card.pending_approval {
  border-left-color: #F59E0B;
  background: rgba(245, 158, 11, 0.04);
}
.slot-card.hold {
  border-left-color: #64748B;
  background: rgba(100, 116, 139, 0.04);
}
.slot-card.cancelled {
  border-left-color: #EF4444;
  background: rgba(239, 68, 68, 0.04);
  opacity: 0.7;
}

.slot-time {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-primary-500);
  display: flex;
  align-items: center;
}
.slot-card.pending_approval .slot-time {
  color: #D97706;
}
.slot-card.hold .slot-time {
  color: #475569;
}
.slot-card.cancelled .slot-time {
  color: #DC2626;
}

.slot-customer {
  font-weight: 600;
  font-size: 0.9rem;
  margin-top: 0.25rem;
  color: var(--p-text-color);
}
.slot-service {
  font-size: 0.8rem;
  color: var(--p-text-color-secondary);
}

.empty-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: var(--p-surface-400);
  font-size: 0.85rem;
  text-align: center;
}

/* Dialog Detalhes */
.details-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.detail-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.detail-item label {
  font-size: 0.75rem;
  color: var(--p-text-color-secondary);
  font-weight: 500;
}
.detail-item .value {
  font-weight: 600;
  color: var(--p-text-color);
  font-size: 0.95rem;
}
.detail-item .value.highlight {
  color: var(--p-primary-500);
}
.details-footer {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  width: 100%;
}

/* Form Nova Reserva */
.new-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.field label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--p-text-color);
}
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.new-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
.w-full { width: 100%; }

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
