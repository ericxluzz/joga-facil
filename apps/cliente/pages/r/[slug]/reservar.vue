<template>
  <div class="page" :style="brandVars">
    <!-- Header com identidade visual da arena -->
    <header class="header">
      <div class="header-bg" />
      <div class="header-overlay" />
      <div class="header-content">
        <div
          class="brand-logo"
          :style="tenant?.settings?.logoUrl
            ? { backgroundImage:`url(${tenant.settings.logoUrl})`, backgroundSize:'cover', backgroundPosition:'center' }
            : {}"
        >
          <span v-if="!tenant?.settings?.logoUrl && tenant?.name">{{ tenant.name[0].toUpperCase() }}</span>
        </div>
        <div class="header-info">
          <span v-if="tenant?.name" class="header-title">{{ tenant.name }}</span>
          <span v-else class="header-title-sk" />
          <span class="header-sub"><i class="pi pi-calendar" /> Escolha seu horário</span>
        </div>
      </div>
    </header>

    <!-- Resource tabs -->
    <div v-if="tenant?.resources?.length > 1" class="resource-tabs px-3 pt-3 pb-2 bg-white">
      <SelectButton
        v-model="selectedResource"
        :options="resourceOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        class="resource-select w-full"
        pt:pcToggleButton:root:class="resource-tab-btn"
      />
    </div>

    <!-- Day selector -->
    <div class="days-row">
      <button class="day-arrow" :disabled="weekOffset === 0" @click="weekOffset--">
        <i class="pi pi-chevron-left" />
      </button>
      <div class="days">
        <button
          v-for="d in visibleDays"
          :key="d.iso"
          class="day-btn"
          :class="{ active: d.iso === selectedDay }"
          @click="selectedDay = d.iso"
        >
          <span class="day-name">{{ d.dayName }}</span>
          <span class="day-num">{{ d.dayNum }}</span>
        </button>
      </div>
      <button class="day-arrow" :disabled="!canGoForward" @click="weekOffset++">
        <i class="pi pi-chevron-right" />
      </button>
    </div>

    <!-- Resource label (if single resource) -->
    <div class="day-label">
      <span>{{ selectedDayLabel }} · {{ selectedResourceName }}</span>
    </div>

    <!-- Slot grid -->
    <div class="slots-container">
      <div v-if="loadingSlots" class="slots-list">
        <Skeleton v-for="i in 6" :key="i" height="72px" border-radius="14px" />
      </div>

      <div v-else-if="slots.length === 0" class="empty">
        <i class="pi pi-calendar-times" />
        <p>Sem horários disponíveis neste dia.</p>
      </div>

      <div v-else class="slots-list">
        <div
          v-for="slot in slots"
          :key="slot.id"
          class="slot"
          :class="{
            selected: cart.has(slot.id),
            unavailable: !slot.available,
          }"
          @click="slot.available && toggleCart(slot.id)"
        >
          <Checkbox
            :modelValue="cart.has(slot.id)"
            :binary="true"
            :disabled="!slot.available"
            style="pointer-events: none"
          />
          <div class="slot-body flex-1">
            <span class="slot-time">{{ slot.time }}</span>
            <span class="slot-duration">{{ slotDuration(slot) }}</span>
          </div>
          <div class="slot-right flex flex-column align-items-end gap-1">
            <span class="slot-price">{{ formatBRL(slot.priceCents) }}</span>
            <Tag v-if="slot.isPeak && slot.available" value="PICO" severity="warn" class="text-xs" />
          </div>
        </div>
      </div>
    </div>

    <!-- Cart footer -->
    <Transition name="slide-up">
      <div v-if="cart.size > 0" class="cart-bar">
        <div class="cart-info">
          <strong>{{ cart.size }} slot{{ cart.size > 1 ? 's' : '' }} · {{ cartHours }}</strong>
          <span class="cart-total">{{ formatBRL(cartTotal) }}</span>
        </div>
        <Button
          label="Continuar"
          icon="pi pi-arrow-right"
          iconPos="right"
          @click="goCheckout"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
import { addDays, format, differenceInMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const route = useRoute();
const slug = route.params.slug as string;

const { tenant, slots, cart, cartTotal, loadingSlots, fetchTenant, fetchSlots, toggleCart, clearCart } = useReserva();

const PALETTE: Record<string, string[]> = {
  emerald: ['#10B981','#059669','#ECFDF5','rgba(16,185,129,.30)'],
  blue:    ['#3B82F6','#2563EB','#EFF6FF','rgba(59,130,246,.30)'],
  orange:  ['#F97316','#EA580C','#FFF7ED','rgba(249,115,22,.30)'],
  red:     ['#EF4444','#DC2626','#FEF2F2','rgba(239,68,68,.30)'],
  purple:  ['#A855F7','#9333EA','#FAF5FF','rgba(168,85,247,.30)'],
  slate:   ['#475569','#334155','#F1F5F9','rgba(71,85,105,.30)'],
};
const pal = computed(() => PALETTE[tenant.value?.settings?.primaryColor ?? 'emerald'] ?? PALETTE.emerald);
const brandVars = computed(() => ({
  '--c' : pal.value[0],
  '--cd': pal.value[1],
  '--cl': pal.value[2],
  '--cs': pal.value[3],
}));

const headerPhotoBg = computed(() =>
  tenant.value?.photoUrl
    ? { backgroundImage: `url(${tenant.value.photoUrl})` }
    : {}
);

const selectedResource = ref<string>('');
const today = new Date();
const MAX_DAYS = 30;
const weekOffset = ref(0);

const allDays = Array.from({ length: MAX_DAYS }).map((_, i) => {
  const d = addDays(today, i);
  return {
    iso: format(d, 'yyyy-MM-dd'),
    dayName: format(d, 'EEE', { locale: ptBR }).replace('.', '').slice(0, 3).toUpperCase(),
    dayNum: format(d, 'dd'),
  };
});

const DAYS_PER_PAGE = 5;
const visibleDays = computed(() => allDays.slice(weekOffset.value * DAYS_PER_PAGE, weekOffset.value * DAYS_PER_PAGE + DAYS_PER_PAGE));
const canGoForward = computed(() => (weekOffset.value + 1) * DAYS_PER_PAGE < MAX_DAYS);

const selectedDay = ref(allDays[0]!.iso);

const selectedDayLabel = computed(() => {
  const d = allDays.find(d => d.iso === selectedDay.value);
  if (!d) return '';
  const date = parseISO(selectedDay.value);
  return format(date, "EEEE · dd 'de' MMM", { locale: ptBR });
});

const selectedResourceName = computed(() => {
  if (!tenant.value?.resources) return '';
  const r = tenant.value.resources.find((r: any) => r.id === selectedResource.value);
  return r ? r.name : '';
});

const resourceOptions = computed(() =>
  (tenant.value?.resources ?? []).map((r: any) => ({
    label: r.name,
    value: r.id,
  })),
);

const cartHours = computed(() => {
  const totalMins = (slots.value as any[])
    .filter(s => cart.value.has(s.id) && s.startsAt && s.endsAt)
    .reduce((sum, s) => sum + differenceInMinutes(parseISO(s.endsAt), parseISO(s.startsAt)), 0);
  if (totalMins === 0) return '';
  return totalMins >= 60 ? `${totalMins / 60}h` : `${totalMins}min`;
});

function slotDuration(slot: any) {
  if (!slot.startsAt || !slot.endsAt) return '';
  const mins = differenceInMinutes(parseISO(slot.endsAt), parseISO(slot.startsAt));
  return `${mins} min`;
}

function resourceTypeLabel(type: string) {
  const map: Record<string, string> = {
    society: 'Society 7',
    padel: 'Padel',
    beach: 'Beach Tennis',
    tennis: 'Tênis',
    futsal: 'Futsal',
    volleyball: 'Vôlei',
    basketball: 'Basquete',
  };
  return map[type] || type;
}

onMounted(async () => {
  await fetchTenant(slug);
  if (tenant.value?.resources?.[0]) selectedResource.value = tenant.value.resources[0].id;
  await loadSlots();
});

watch([selectedDay, selectedResource], () => {
  if (selectedResource.value) loadSlots();
});

watch(() => route.params.slug, async (newSlug) => {
  if (newSlug && newSlug !== slug) {
    clearCart();
    await fetchTenant(newSlug as string);
    if (tenant.value?.resources?.[0]) selectedResource.value = tenant.value.resources[0].id;
    await loadSlots();
  }
});

async function loadSlots() {
  if (!selectedResource.value) return;
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
.page {
  padding-bottom: calc(7rem + 58px);
  background: var(--p-surface-50, #f9fafb);
  min-height: 100dvh;
}

/* Header com identidade visual */
.header {
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--c, #10B981);
}
.header-bg {
  position: absolute; inset: 0;
  background-size: cover; background-position: center;
  opacity: .22;
}
.header-overlay { display: none; }
.header-content {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 14px;
  padding: 18px 18px 20px;
}
.brand-logo {
  width: 48px; height: 48px; flex-shrink: 0;
  border-radius: 13px;
  background-color: rgba(255,255,255,.22);
  border: 2px solid rgba(255,255,255,.45);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.25rem; font-weight: 800; color: #fff;
  overflow: hidden;
}
.header-info { display: flex; flex-direction: column; }
.header-title { font-size: 1.1rem; font-weight: 800; color: #fff; line-height: 1.2; }
.header-title-sk {
  display: block; width: 140px; height: 18px; border-radius: 6px;
  background: rgba(255,255,255,.25); animation: hsk 1.2s infinite;
}
@keyframes hsk { 0%,100%{opacity:.5} 50%{opacity:1} }
.header-sub { font-size: .73rem; color: rgba(255,255,255,.78); margin-top: 3px; display: flex; align-items: center; gap: 4px; }
.header-sub .pi { font-size: .65rem; }

.resource-select :deep(.p-togglebutton) {
  flex: 1 1 auto;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.75rem 1rem;
}

:deep(.resource-tab-btn) {
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.75rem 1rem;
}

/* Day selector */
.days-row {
  display: flex;
  align-items: center;
  background: var(--p-surface-0);
  border-bottom: 1px solid var(--p-surface-100);
  padding: 0.75rem 0.5rem;
  gap: 0.25rem;
}

.day-arrow {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--p-text-color-secondary);
  font-size: 0.75rem;
  transition: background 0.12s;
}
.day-arrow:hover:not(:disabled) { background: var(--p-surface-100); }
.day-arrow:disabled { opacity: 0.3; cursor: default; }

.days {
  display: flex;
  flex: 1;
  justify-content: space-between;
  gap: 0.25rem;
}

.day-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: transparent;
  border: 1.5px solid transparent;
  border-radius: 10px;
  padding: 7px 2px;
  cursor: pointer;
  font-family: inherit;
  color: var(--p-text-color-secondary);
  transition: all 0.15s;
  min-width: 0;
}
.day-btn:hover:not(.active) { background: var(--p-surface-50); }
.day-btn.active {
  background: var(--c, var(--p-primary-500));
  color: white;
}

.day-name {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
}

.day-num {
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.1;
}

/* Day label */
.day-label {
  padding: 0.75rem 1.25rem 0.25rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--p-text-color-secondary);
  text-transform: capitalize;
  letter-spacing: 0.02em;
}

/* Slots */
.slots-container { padding: 0.5rem 1rem 1rem; }
.slots-list { display: flex; flex-direction: column; gap: 0.5rem; }

.slot {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  background: var(--p-surface-0);
  border: 1.5px solid var(--p-surface-100);
  border-radius: 14px;
  padding: 1rem 1rem;
  cursor: pointer;
  transition: all 0.15s;
  width: 100%;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.slot:hover:not(.unavailable) {
  border-color: var(--c);
  box-shadow: 0 4px 16px var(--cs, rgba(16,185,129,0.08));
}
.slot.selected {
  background: var(--cl, #ecfdf5);
  border-color: var(--c);
  box-shadow: 0 4px 16px var(--cs, rgba(16,185,129,0.12));
}
.slot.unavailable {
  opacity: 0.4;
  cursor: not-allowed;
}

.slot-body {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.slot-time {
  font-size: 1rem;
  font-weight: 600;
  color: var(--p-text-color);
  letter-spacing: -0.01em;
}
.slot-duration {
  font-size: 0.75rem;
  color: var(--p-text-color-secondary);
}

.slot-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3rem;
}
.slot-price {
  font-size: 0.975rem;
  font-weight: 700;
  color: var(--p-text-color);
}
/* Empty state */
.empty {
  padding: 4rem 1rem;
  text-align: center;
  color: var(--p-text-color-secondary);
}
.empty i { font-size: 2.5rem; color: var(--p-surface-300); display: block; margin-bottom: 0.75rem; }
.empty p { margin: 0; font-size: 0.9rem; }

/* Cart bar */
.cart-bar {
  position: fixed;
  bottom: 58px; left: 0; right: 0;
  max-width: 480px; margin: 0 auto;
  background: var(--p-surface-0);
  border-top: 1px solid var(--p-surface-100);
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 -8px 32px rgba(0,0,0,0.08);
  z-index: 50;
}
.cart-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.cart-info strong { font-size: 0.9rem; font-weight: 700; }
.cart-total { font-size: 1rem; color: var(--cd, #059669); font-weight: 700; }

/* Transitions */
.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.25s ease, opacity 0.25s ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); opacity: 0; }
</style>
