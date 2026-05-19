<template>
  <div class="page">
    <header class="header">
      <button class="back" @click="$router.back()"><i class="pi pi-arrow-left"></i></button>
      <h1>Escolha o horário</h1>
    </header>

    <!-- Quadra selector (se tiver mais de uma) -->
    <div v-if="tenant?.resources?.length > 1" class="resource-selector">
      <div
        v-for="r in tenant.resources"
        :key="r.id"
        class="resource-chip"
        :class="{ active: selectedResource === r.id }"
        @click="selectedResource = r.id"
      >
        {{ r.name }}
      </div>
    </div>

    <!-- Carrossel de dias -->
    <div class="days">
      <button
        v-for="d in days"
        :key="d.iso"
        class="day"
        :class="{ active: d.iso === selectedDay }"
        @click="selectedDay = d.iso"
      >
        <span class="day-name">{{ d.dayName }}</span>
        <span class="day-num">{{ d.dayNum }}</span>
        <span class="day-month">{{ d.dayMonth }}</span>
      </button>
    </div>

    <!-- Grid de slots -->
    <div class="slots-container">
      <div v-if="loadingSlots" class="slots-grid">
        <Skeleton v-for="i in 8" :key="i" height="74px" />
      </div>

      <div v-else-if="slots.length === 0" class="empty">
        <i class="pi pi-calendar-times"></i>
        <p>Sem horários disponíveis neste dia.</p>
      </div>

      <div v-else class="slots-grid">
        <button
          v-for="slot in slots"
          :key="slot.id"
          class="slot"
          :class="{
            selected: cart.has(slot.id),
            unavailable: !slot.available,
            peak: slot.isPeak,
          }"
          :disabled="!slot.available"
          @click="toggleCart(slot.id)"
        >
          <span class="slot-time">{{ slot.time }}</span>
          <span class="slot-price">{{ formatBRL(slot.priceCents) }}</span>
          <span v-if="slot.isPeak && slot.available" class="badge">Peak</span>
        </button>
      </div>
    </div>

    <!-- Cart bar -->
    <div v-if="cart.size > 0" class="cart-bar">
      <div class="cart-info">
        <strong>{{ cart.size }} horário{{ cart.size > 1 ? 's' : '' }}</strong>
        <span class="cart-total">{{ formatBRL(cartTotal) }}</span>
      </div>
      <Button label="Continuar" icon="pi pi-arrow-right" iconPos="right" @click="goCheckout" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import Skeleton from 'primevue/skeleton';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const route = useRoute();
const slug = route.params.slug as string;

const { tenant, slots, cart, cartTotal, loadingSlots, fetchTenant, fetchSlots, toggleCart } = useReserva();

const selectedResource = ref<string>('res-1');
const today = new Date();
const days = Array.from({ length: 14 }).map((_, i) => {
  const d = addDays(today, i);
  return {
    iso: format(d, 'yyyy-MM-dd'),
    dayName: format(d, 'EEE', { locale: ptBR }).replace('.', ''),
    dayNum: format(d, 'dd'),
    dayMonth: format(d, 'MMM', { locale: ptBR }).replace('.', ''),
  };
});

const selectedDay = ref(days[0]!.iso);

onMounted(async () => {
  if (!tenant.value) await fetchTenant(slug);
  if (tenant.value?.resources?.[0]) selectedResource.value = tenant.value.resources[0].id;
  await loadSlots();
});

watch([selectedDay, selectedResource], loadSlots);

async function loadSlots() {
  await fetchSlots(slug, selectedDay.value, selectedResource.value);
}

function goCheckout() {
  navigateTo(`/r/${slug}/checkout`);
}

function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}
</script>

<style scoped>
.page { padding-bottom: 6rem; }

.header {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--p-surface-100);
  position: sticky; top: 0; background: var(--p-surface-0); z-index: 10;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
}
.back {
  width: 36px; height: 36px;
  background: none; border: none;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%; cursor: pointer;
  color: var(--p-text-color);
}
.back:hover { background: var(--p-surface-100); }
h1 { margin: 0; font-size: 1.05rem; font-weight: 600; }

.resource-selector {
  display: flex; gap: 0.5rem;
  padding: 1rem 1.5rem 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.resource-selector::-webkit-scrollbar { display: none; }
.resource-chip {
  flex: 0 0 auto;
  padding: 0.5rem 1rem;
  background: var(--p-surface-100);
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  color: var(--p-text-color-secondary);
  transition: all 0.15s;
}
.resource-chip.active {
  background: var(--p-primary-500);
  color: white;
}

.days {
  display: flex; gap: 0.5rem;
  padding: 1rem 1.5rem;
  overflow-x: auto;
  scrollbar-width: none;
}
.days::-webkit-scrollbar { display: none; }
.day {
  flex: 0 0 auto;
  display: flex; flex-direction: column; align-items: center; gap: 0.125rem;
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-150);
  border-radius: 0.875rem;
  padding: 0.625rem 0.875rem;
  cursor: pointer; min-width: 64px;
  font-family: inherit;
  color: var(--p-text-color);
  transition: all 0.15s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.01);
}
.day.active {
  border-color: var(--p-primary-500);
  background: var(--p-primary-50);
}
.day-name {
  font-size: 0.7rem;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--p-text-color-secondary);
  letter-spacing: 0.03em;
}
.day-num { font-size: 1.35rem; font-weight: 700; line-height: 1.1; }
.day-month {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--p-text-color-secondary);
}

.slots-container { padding: 0 1rem 2rem; }
.slots-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}
.slot {
  position: relative;
  display: flex; flex-direction: column; gap: 0.25rem;
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-100);
  border-radius: 1rem;
  padding: 1rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
  text-align: left;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
}
.slot:hover:not(.unavailable) {
  border-color: var(--p-primary-300);
  transform: translateY(-1px);
}
.slot.selected {
  background: var(--p-primary-50);
  border-color: var(--p-primary-500);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
}
.slot.unavailable {
  opacity: 0.45; cursor: not-allowed;
  box-shadow: none;
}
.slot.unavailable .slot-time { text-decoration: line-through; }
.slot-time { font-size: 1.05rem; font-weight: 600; color: var(--p-text-color); }
.slot-price { font-size: 0.85rem; color: var(--p-primary-700); font-weight: 500; }
.badge {
  position: absolute;
  top: 0.5rem; right: 0.5rem;
  background: var(--p-orange-100, #FFE8CC);
  color: #C2410C;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
}

.empty {
  padding: 4rem 1rem;
  text-align: center;
  color: var(--p-text-color-secondary);
}
.empty i { font-size: 2.5rem; color: var(--p-surface-400); display: block; margin-bottom: 0.75rem; }
.empty p { margin: 0; font-size: 0.9rem; }

.cart-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  max-width: 480px; margin: 0 auto;
  background: var(--p-surface-0);
  border-top: 1px solid var(--p-surface-100);
  padding: 1.25rem 1.5rem;
  display: flex; justify-content: space-between; align-items: center; gap: 1rem;
  box-shadow: 0 -8px 24px rgba(0,0,0,0.06);
  border-radius: 1.25rem 1.25rem 0 0;
  z-index: 20;
}
.cart-info {
  display: flex; flex-direction: column;
}
.cart-info strong { font-size: 0.95rem; }
.cart-total { font-size: 0.85rem; color: var(--p-primary-700); font-weight: 600; }
</style>
