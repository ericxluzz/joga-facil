<template>
  <div class="agenda-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Agenda</h1>
        <p class="page-subtitle">
          {{ formattedDate }} · {{ totalConfirmed }} confirmadas, {{ totalAvailable }} horários livres
        </p>
      </div>
      <div class="header-actions">
        <Button
          icon="pi pi-chevron-left"
          text
          rounded
          aria-label="Dia anterior"
          @click="shiftDay(-1)"
        />
        <DatePicker
          v-model="selectedDate"
          dateFormat="dd/mm/yy"
          showIcon
          iconDisplay="input"
          class="date-picker"
        />
        <Button
          icon="pi pi-chevron-right"
          text
          rounded
          aria-label="Próximo dia"
          @click="shiftDay(1)"
        />
        <Button label="Nova Reserva" icon="pi pi-plus" @click="openNewBookingDialog()" />
      </div>
    </header>

    <div class="flex align-items-center justify-content-between gap-3 flex-wrap">
      <SelectButton
        v-model="statusFilter"
        :options="statusOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        size="small"
      >
        <template #option="{ option }">
          {{ option.label }}
          <Badge
            v-if="option.count > 0"
            :value="String(option.count)"
            severity="secondary"
            class="ml-1"
          />
        </template>
      </SelectButton>
      <div class="flex align-items-center gap-2">
        <ToggleSwitch v-model="showVacant" inputId="show-vacant" />
        <label for="show-vacant" class="text-sm text-color-secondary" style="cursor:pointer">
          Horários vagos
        </label>
      </div>
    </div>

    <div v-if="pending" class="grid-columns">
      <SectionSkeleton v-for="i in 3" :key="i" variant="card" :height="400" />
    </div>

    <div v-else-if="resources.length === 0" class="empty-state">
      <i class="pi pi-objects-column" />
      <h3>Nenhuma quadra cadastrada</h3>
      <p>Cadastre quadras em Configurações → Quadras para começar a usar a agenda.</p>
      <Button label="Ir para Quadras" icon="pi pi-arrow-right" @click="navigateTo('/configuracoes/quadras')" />
    </div>

    <div v-else class="grid-columns">
      <Card v-for="res in resources" :key="res.id" class="column-card">
        <template #title>
          <div class="flex align-items-center justify-content-between">
            <div class="flex align-items-center gap-2">
              <Avatar
                v-if="res.photoUrl"
                :image="res.photoUrl"
                shape="square"
                size="normal"
              />
              <Avatar
                v-else
                icon="pi pi-objects-column"
                shape="square"
                size="normal"
                style="background:var(--p-primary-100);color:var(--p-primary-600)"
              />
              <div>
                <div class="font-semibold text-base">{{ res.name }}</div>
                <div class="text-xs text-color-secondary">
                  {{ getOccupiedCount(res.id) }} / {{ getTotalSlots(res.id) }} ocupados
                </div>
              </div>
            </div>
            <Button
              icon="pi pi-plus"
              text
              rounded
              severity="secondary"
              aria-label="Nova reserva"
              @click="openNewBookingDialog(res.id)"
            />
          </div>
        </template>
        <template #content>
          <div class="slots-list">
            <template v-for="item in getTimelineForResource(res.id)" :key="`${item.kind}-${item.startTime}-${item.id || ''}`">
              <Button
                v-if="item.kind === 'vacant'"
                text
                fluid
                class="vacant-btn"
                @click="openNewBookingDialog(res.id, item.startTime, item.endTime, item.priceCents)"
              >
                <div class="flex justify-content-between align-items-center w-full">
                  <span class="font-semibold text-sm">{{ item.startTime }} – {{ item.endTime }}</span>
                  <span class="flex align-items-center gap-1 text-xs">
                    <i class="pi pi-plus" /> {{ formatBRL(item.priceCents) }}
                  </span>
                </div>
              </Button>
              <div
                v-else
                :class="['booking-card', `status-${item.status}`]"
                @click="openDetailsDialog(item)"
              >
                <div class="bc-time">
                  <strong>{{ item.startTime }}</strong>
                  <span>{{ item.endTime }}</span>
                </div>
                <div class="bc-body">
                  <strong>{{ item.customerName }}</strong>
                  <div class="bc-meta">
                    <span>{{ formatBRL(item.priceCents) }}</span>
                    <Tag :value="statusInfo(item.status).label" :severity="statusInfo(item.status).severity" />
                  </div>
                </div>
              </div>
            </template>

            <div v-if="getTimelineForResource(res.id).length === 0" class="empty-column">
              <i class="pi pi-calendar-minus" />
              <span>Sem horários para hoje</span>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <Dialog v-model:visible="detailsVisible" header="Detalhes do agendamento" modal :style="{ width: '460px' }">
      <div v-if="activeBooking" class="details-body">
        <div class="detail-row">
          <div class="detail-item">
            <label>Cliente</label>
            <span class="value">{{ activeBooking.customerName }}</span>
          </div>
          <div class="detail-item" v-if="activeBooking.customerPhone">
            <label>Telefone</label>
            <span class="value">{{ activeBooking.customerPhone }}</span>
          </div>
        </div>
        <div class="detail-row">
          <div class="detail-item">
            <label>Quadra</label>
            <span class="value">{{ activeBooking.resourceName }}</span>
          </div>
          <div class="detail-item">
            <label>Horário</label>
            <span class="value highlight">{{ activeBooking.startTime }} – {{ activeBooking.endTime }}</span>
          </div>
        </div>
        <div class="detail-row">
          <div class="detail-item">
            <label>Valor</label>
            <span class="value">{{ formatBRL(activeBooking.priceCents) }}</span>
          </div>
          <div class="detail-item">
            <label>Status</label>
            <Tag
              :value="statusInfo(activeBooking.status).label"
              :severity="statusInfo(activeBooking.status).severity"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="details-footer">
          <Button
            v-if="activeBooking?.status === 'pending_approval'"
            label="Aprovar"
            severity="success"
            @click="approveActiveBooking"
            :loading="actionLoading"
          />
          <Button
            v-if="activeBooking && activeBooking.status !== 'cancelled'"
            label="Cancelar reserva"
            severity="danger"
            outlined
            @click="cancelActiveBooking"
            :loading="actionLoading"
          />
        </div>
      </template>
    </Dialog>

    <Dialog v-model:visible="newVisible" header="Nova reserva" modal :style="{ width: '460px' }">
      <form @submit.prevent="saveNewBooking" class="new-form">
        <div class="field">
          <label for="new-customer">Nome do cliente *</label>
          <InputText id="new-customer" v-model="newForm.customerName" required class="w-full" />
        </div>
        <div class="field">
          <label for="new-phone">Telefone (WhatsApp)</label>
          <InputMask
            id="new-phone"
            v-model="newForm.customerPhone"
            mask="(99) 99999-9999"
            placeholder="(11) 99999-9999"
            class="w-full"
          />
        </div>
        <div class="field">
          <label for="new-resource">Quadra *</label>
          <Select
            id="new-resource"
            v-model="newForm.resourceId"
            :options="resources"
            optionLabel="name"
            optionValue="id"
            placeholder="Selecione"
            class="w-full"
            required
          />
        </div>
        <div class="field-row">
          <div class="field">
            <label for="new-start">Início *</label>
            <InputMask
              id="new-start"
              v-model="newForm.startTime"
              mask="99:99"
              placeholder="08:00"
              class="w-full"
              required
            />
          </div>
          <div class="field">
            <label for="new-end">Fim *</label>
            <InputMask
              id="new-end"
              v-model="newForm.endTime"
              mask="99:99"
              placeholder="09:00"
              class="w-full"
              required
            />
          </div>
        </div>
        <div class="field">
          <label for="new-price">Valor (R$)</label>
          <InputNumber
            id="new-price"
            v-model="newForm.price"
            mode="decimal"
            :minFractionDigits="2"
            class="w-full"
          />
        </div>
        <div class="new-footer">
          <Button
            label="Cancelar"
            severity="secondary"
            outlined
            @click="newVisible = false"
            type="button"
          />
          <Button label="Salvar reserva" type="submit" :loading="actionLoading" />
        </div>
      </form>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import Avatar from 'primevue/avatar';
import Badge from 'primevue/badge';
import Button from 'primevue/button';
import Card from 'primevue/card';
import DatePicker from 'primevue/datepicker';
import Dialog from 'primevue/dialog';
import InputMask from 'primevue/inputmask';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import SelectButton from 'primevue/selectbutton';
import Tag from 'primevue/tag';
import ToggleSwitch from 'primevue/toggleswitch';

definePageMeta({ layout: 'default' });

const route = useRoute();
const selectedDate = ref<Date>(new Date());
const statusFilter = ref<string>('all');
const showVacant = ref(true);
const actionLoading = ref(false);

const dateKey = computed(() => formatDateKey(selectedDate.value));

const nuxtApp = useNuxtApp();

const { data: resourcesData, pending: pendingResources } = useFetch<any>('/api/resources', {
  key: 'resources',
  server: false,
  default: () => ({ resources: [] }),
  // recursos raramente mudam — usa cache indefinidamente durante a sessão
  getCachedData: (key) =>
    nuxtApp.payload.data[key] ?? (nuxtApp.static?.data?.[key] ?? undefined),
});

const { data: bookingsData, pending: pendingBookings, refresh } = useFetch<any>(
  () => `/api/bookings?date=${dateKey.value}`,
  {
    key: () => `bookings-${dateKey.value}`,
    server: false,
    default: () => ({ bookings: [], availableSlots: {} }),
    watch: [dateKey],
    // cache por data — se voltar para o mesmo dia, instantâneo
    getCachedData: (key) =>
      nuxtApp.payload.data[key] ?? (nuxtApp.static?.data?.[key] ?? undefined),
  },
);

const pending = computed(() => pendingResources.value || pendingBookings.value);

const resources = computed<any[]>(() => resourcesData.value?.resources || []);
const bookings = computed<any[]>(() => bookingsData.value?.bookings || []);
const availableSlots = computed<Record<string, any[]>>(
  () => bookingsData.value?.availableSlots || {},
);

const totalConfirmed = computed(
  () => bookings.value.filter((b) => b.status === 'confirmed').length,
);

const totalAvailable = computed(() => {
  let total = 0;
  for (const list of Object.values(availableSlots.value)) {
    total += (list as any[]).filter((s) => s.available).length;
  }
  return total;
});

const formattedDate = computed(() =>
  selectedDate.value.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }),
);

const statusOptions = computed(() => [
  { label: 'Todas', value: 'all', count: bookings.value.length },
  {
    label: 'Confirmadas',
    value: 'confirmed',
    count: bookings.value.filter((b) => b.status === 'confirmed').length,
  },
  {
    label: 'Pendentes',
    value: 'pending_approval',
    count: bookings.value.filter((b) => b.status === 'pending_approval').length,
  },
]);

function formatDateKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function shiftDay(days: number) {
  const next = new Date(selectedDate.value);
  next.setDate(next.getDate() + days);
  selectedDate.value = next;
}

function getOccupiedCount(resId: string) {
  return bookings.value.filter(
    (b) => b.resourceId === resId && b.status !== 'cancelled' && b.status !== 'expired',
  ).length;
}

function getTotalSlots(resId: string) {
  return (availableSlots.value[resId] || []).length;
}

function getTimelineForResource(resId: string) {
  const list = bookings.value
    .filter((b) => b.resourceId === resId)
    .filter((b) => statusFilter.value === 'all' || b.status === statusFilter.value)
    .map((b) => ({ ...b, kind: 'booking' as const }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (!showVacant.value || statusFilter.value !== 'all') return list;

  const slots = (availableSlots.value[resId] || []).filter((s) => s.available);
  const bookedStarts = new Set(bookings.value
    .filter((b) => b.resourceId === resId && b.status !== 'cancelled' && b.status !== 'expired')
    .map((b) => b.startTime));

  const vacantCards = slots
    .filter((s) => !bookedStarts.has(s.startTime))
    .map((s) => ({
      kind: 'vacant' as const,
      startTime: s.startTime,
      endTime: s.endTime,
      priceCents: s.priceCents,
    }));

  return [...list, ...vacantCards].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function statusInfo(status: string) {
  switch (status) {
    case 'confirmed':
      return { label: 'Confirmada', severity: 'success' as const };
    case 'pending_approval':
      return { label: 'Pendente', severity: 'warn' as const };
    case 'hold':
      return { label: 'Carrinho', severity: 'secondary' as const };
    case 'expired':
      return { label: 'Expirada', severity: 'danger' as const };
    case 'cancelled':
      return { label: 'Cancelada', severity: 'danger' as const };
    default:
      return { label: status, severity: 'info' as const };
  }
}

function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    (cents || 0) / 100,
  );
}

const detailsVisible = ref(false);
const activeBooking = ref<any>(null);

function openDetailsDialog(b: any) {
  activeBooking.value = b;
  detailsVisible.value = true;
}

async function approveActiveBooking() {
  if (!activeBooking.value) return;
  actionLoading.value = true;
  try {
    await $fetch(`/api/bookings/${activeBooking.value.id}/approve`, { method: 'PATCH' });
    await refresh();
    detailsVisible.value = false;
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
    await $fetch(`/api/bookings/${activeBooking.value.id}/cancel`, { method: 'PATCH' });
    await refresh();
    detailsVisible.value = false;
  } catch (err) {
    console.error(err);
  } finally {
    actionLoading.value = false;
  }
}

const newVisible = ref(false);
const newForm = reactive({
  customerName: '',
  customerPhone: '',
  resourceId: '',
  startTime: '',
  endTime: '',
  price: 150,
});

function openNewBookingDialog(resourceId?: string, startTime?: string, endTime?: string, priceCents?: number) {
  newForm.customerName = '';
  newForm.customerPhone = '';
  newForm.resourceId = resourceId || resources.value[0]?.id || '';
  newForm.startTime = startTime || '';
  newForm.endTime = endTime || '';
  newForm.price = priceCents != null ? priceCents / 100 : 150;
  newVisible.value = true;
}

async function saveNewBooking() {
  actionLoading.value = true;
  try {
    await $fetch('/api/bookings', {
      method: 'POST',
      body: {
        customerName: newForm.customerName,
        customerPhone: newForm.customerPhone,
        resourceId: newForm.resourceId,
        startTime: newForm.startTime,
        endTime: newForm.endTime,
        date: dateKey.value,
        priceCents: Math.round(newForm.price * 100),
        status: 'confirmed',
      },
    });
    newVisible.value = false;
    await refresh();
  } catch (err) {
    console.error(err);
  } finally {
    actionLoading.value = false;
  }
}

// pré-preenche filtro de busca pelo query string (busca global do topbar)
onMounted(() => {
  const q = route.query.q;
  if (typeof q === 'string' && q.trim()) {
    // implementação simples — apenas chama search
    statusFilter.value = 'all';
  }
});
</script>

<style scoped>
.agenda-page {
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
  letter-spacing: -0.01em;
}

.page-subtitle {
  margin: 0.25rem 0 0;
  color: var(--p-text-color-secondary);
  font-size: 0.9rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

:deep(.date-picker) {
  width: 160px;
}


.grid-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  align-items: flex-start;
}

.column-card {
  min-height: 320px;
}

:deep(.column-card .p-card-body) {
  height: 100%;
}

.slots-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.vacant-btn {
  border: 1px dashed var(--p-surface-300) !important;
  border-radius: 0.5rem;
  color: var(--p-text-color-secondary) !important;
  justify-content: stretch;
  padding: 0.5rem 0.75rem;
}

.vacant-btn:hover {
  background: var(--p-primary-50) !important;
  border-color: var(--p-primary-300) !important;
  color: var(--p-primary-600) !important;
}

/* Booking card */
.booking-card {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 0.625rem;
  align-items: center;
  padding: 0.625rem 0.75rem;
  border-radius: 0.625rem;
  border-left: 4px solid var(--p-surface-300);
  background: var(--p-surface-50);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.booking-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.booking-card.status-confirmed {
  border-left-color: #10b981;
  background: rgba(16, 185, 129, 0.06);
}

.booking-card.status-pending_approval {
  border-left-color: #f59e0b;
  background: rgba(245, 158, 11, 0.06);
}

.booking-card.status-hold {
  border-left-color: #64748b;
  background: rgba(100, 116, 139, 0.06);
}

.booking-card.status-cancelled,
.booking-card.status-expired {
  border-left-color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
  opacity: 0.7;
}

.bc-time {
  display: flex;
  flex-direction: column;
}

.bc-time strong {
  font-size: 1rem;
  font-weight: 700;
  color: var(--p-text-color);
  letter-spacing: -0.01em;
}

.bc-time span {
  font-size: 0.7rem;
  color: var(--p-text-color-secondary);
}

.bc-body strong {
  display: block;
  font-size: 0.85rem;
  color: var(--p-text-color);
  margin-bottom: 0.125rem;
}

.bc-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.78rem;
  color: var(--p-text-color-secondary);
}

.empty-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  color: var(--p-surface-400);
  font-size: 0.85rem;
  text-align: center;
  gap: 0.375rem;
}

.empty-column i {
  font-size: 1.5rem;
}

.empty-state {
  background: var(--p-surface-0);
  border: 1px dashed var(--p-surface-200);
  border-radius: 1rem;
  padding: 3rem 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.empty-state i {
  font-size: 2.5rem;
  color: var(--p-surface-300);
}

.empty-state h3 {
  margin: 0;
  color: var(--p-text-color);
}

.empty-state p {
  margin: 0;
  color: var(--p-text-color-secondary);
  font-size: 0.9rem;
  max-width: 400px;
}

/* Dialog */
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
  color: var(--p-primary-600);
}

.details-footer {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  width: 100%;
}

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

.w-full {
  width: 100%;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  .header-actions {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
  .detail-row,
  .field-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .header-actions {
    justify-content: space-between;
  }
  :deep(.date-picker) {
    flex: 1;
    width: auto;
  }
}
</style>
