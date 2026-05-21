<template>
  <div class="page">
    <header class="header">
      <div>
        <h1 class="header-title">Meus agendamentos</h1>
        <p v-if="storedName" class="header-sub">Olá, {{ storedName.split(' ')[0] }}</p>
      </div>
    </header>

    <div v-if="loading && !searched" class="auto-loading flex flex-column align-items-center">
      <ProgressSpinner style="width: 36px; height: 36px" strokeWidth="4" />
      <p>Carregando seus agendamentos…</p>
    </div>

    <div v-else-if="!searched" class="lookup-wrap p-4">
      <Card>
        <template #content>
          <div class="flex flex-column align-items-center text-center gap-3">
            <div class="lookup-icon flex align-items-center justify-content-center">
              <i class="pi pi-list-check" />
            </div>
            <p class="lookup-heading m-0 font-bold text-lg">Acesse seus agendamentos</p>
            <p class="lookup-sub m-0 text-sm text-color-secondary">
              Digite seu WhatsApp cadastrado no momento da reserva.
            </p>
            <div class="field w-full text-left">
              <label class="field-label">WhatsApp</label>
              <InputMask
                v-model="phone"
                mask="(99) 99999-9999"
                class="w-full"
                placeholder="(51) 99999-9999"
                @keydown.enter="buscar"
              />
            </div>
            <Button
              label="Ver meus agendamentos"
              icon="pi pi-search"
              fluid
              :loading="loading"
              @click="buscar"
            />
          </div>
        </template>
      </Card>
    </div>

    <template v-else-if="searched">
      <div class="results-header flex justify-content-between align-items-center px-4 py-3">
        <p class="results-label m-0 text-sm font-semibold text-color-secondary">
          {{ bookings.length > 0
            ? `${bookings.length} agendamento${bookings.length > 1 ? 's' : ''} encontrado${bookings.length > 1 ? 's' : ''}`
            : 'Nenhum agendamento encontrado' }}
        </p>
        <Button label="Trocar número" link size="small" @click="resetar" />
      </div>

      <div v-if="bookings.length === 0" class="empty flex flex-column align-items-center">
        <i class="pi pi-calendar-times" />
        <p>Nenhuma reserva vinculada a esse número.</p>
      </div>

      <div v-else class="list flex flex-column gap-2 px-3 pb-4">
        <Card v-for="b in bookings" :key="b.id">
          <template #content>
            <div class="flex justify-content-between align-items-start gap-2 mb-2">
              <div>
                <p class="bc-arena m-0 font-bold">{{ b.tenantName }}</p>
                <p class="bc-resource m-0 mt-1 text-sm text-color-secondary">{{ b.resourceName }}</p>
              </div>
              <Tag :value="statusLabel(b.status)" :severity="statusSeverity(b.status)" />
            </div>
            <Divider />
            <div class="flex align-items-center gap-3 flex-wrap pt-2">
              <span class="bc-info text-sm text-color-secondary">
                <i class="pi pi-calendar mr-1" />{{ formatDate(b.startsAt) }}
              </span>
              <span class="bc-info text-sm text-color-secondary">
                <i class="pi pi-clock mr-1" />{{ formatTime(b.startsAt) }} – {{ formatTime(b.endsAt) }}
              </span>
              <span class="bc-price ml-auto font-bold">{{ formatBRL(b.totalCents) }}</span>
            </div>
          </template>
        </Card>
      </div>
    </template>

    <div style="height: 72px" />
  </div>
</template>

<script setup lang="ts">
import { useStorage } from '@vueuse/core';

const storedPhone = useStorage('jf_customer_phone', '');
const storedName  = useStorage('jf_customer_name', '');

const phone    = ref(storedPhone.value);
const loading  = ref(false);
const searched = ref(false);
const bookings = ref<any[]>([]);

onMounted(async () => {
  if (storedPhone.value.replace(/\D/g, '').length >= 10) {
    await buscar();
  }
});

async function buscar() {
  const digits = phone.value.replace(/\D/g, '');
  if (digits.length < 10) return;
  loading.value = true;
  try {
    const data = await $fetch<any[]>('/api/minhas-reservas', { query: { phone: digits } });
    bookings.value = data;
    searched.value = true;
    storedPhone.value = phone.value;
  } catch {
    bookings.value = [];
    searched.value = true;
  } finally {
    loading.value = false;
  }
}

function resetar() {
  searched.value = false;
  bookings.value = [];
  phone.value = '';
  storedPhone.value = '';
  storedName.value = '';
}

function statusLabel(s: string) {
  const m: Record<string, string> = {
    confirmed: 'Confirmada',
    pending_payment: 'Aguardando pagamento',
    pending_approval: 'Aguardando aprovação',
    paid: 'Paga',
    cancelled: 'Cancelada',
    no_show: 'Não compareceu',
  };
  return m[s] ?? s;
}

function statusSeverity(s: string): 'success' | 'warn' | 'danger' | 'secondary' {
  if (s === 'confirmed' || s === 'paid') return 'success';
  if (s === 'pending_payment' || s === 'pending_approval') return 'warn';
  if (s === 'cancelled' || s === 'no_show') return 'danger';
  return 'secondary';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}
function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}
</script>

<style scoped>
.page {
  min-height: 100dvh;
  background: var(--p-surface-50, #f9fafb);
}

.header {
  background: var(--p-surface-0);
  padding: 1.125rem 1.25rem 1rem;
  border-bottom: 1px solid var(--p-surface-100);
  position: sticky;
  top: 0;
  z-index: 20;
}

.header-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}

.header-sub {
  margin: 2px 0 0;
  font-size: 0.76rem;
  color: var(--p-text-color-secondary);
}

.lookup-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--p-primary-50, #ecfdf5);
  font-size: 1.4rem;
  color: var(--p-primary-500);
}

.field-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--p-text-color-secondary);
  margin-bottom: 0.35rem;
}

.auto-loading {
  padding: 5rem 1.5rem;
  color: var(--p-text-color-secondary);
  gap: 1rem;
}

.empty {
  padding: 4rem 1.5rem;
  text-align: center;
  color: var(--p-text-color-secondary);
  gap: 0.75rem;
}

.empty .pi {
  font-size: 2.2rem;
  color: var(--p-surface-300);
}

.bc-arena {
  font-size: 0.88rem;
}

.bc-price {
  font-size: 0.88rem;
}
</style>
