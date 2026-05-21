<template>
  <div class="page">
    <header class="header">
      <Button
        icon="pi pi-arrow-left"
        text
        rounded
        aria-label="Voltar"
        @click="onBack"
      />
      <h1>{{ step === 'cart' ? 'Seu carrinho' : 'Pagamento' }}</h1>
    </header>

    <Message
      v-if="cartItems.length > 0"
      severity="warn"
      icon="pi pi-clock"
      :closable="false"
      class="timer-msg"
    >
      Horários travados por <strong>{{ formattedTimer }}</strong>
    </Message>

    <div v-if="cartItems.length === 0" class="empty flex flex-column align-items-center">
      <i class="pi pi-shopping-cart empty-icon" />
      <p>Seu carrinho está vazio.</p>
      <Button label="Escolher horários" outlined @click="$router.back()" />
    </div>

    <div v-else class="container flex flex-column gap-3 p-3">
      <!-- ── Etapa 1: Carrinho ─────────────────────────────────────── -->
      <template v-if="step === 'cart'">
        <Card class="slot-card-wrap">
          <template #content>
            <div
              v-for="(item, idx) in cartItems"
              :key="item.id"
              class="slot-row"
              :class="{ 'slot-row--border': idx < cartItems.length - 1 }"
            >
              <div class="day-badge">
                <span class="badge-dow">{{ getDayAbbr(item.startsAt) }}</span>
                <span class="badge-num">{{ getDayNum(item.startsAt) }}</span>
              </div>
              <div class="slot-info flex-1">
                <span class="slot-time">{{ item.time }}</span>
                <span class="slot-resource">{{ getResourceName(item.resourceId) }} · {{ resourceTypeLabel(getResourceType(item.resourceId)) }}</span>
                <span class="slot-date">{{ formatFullDate(item.startsAt) }}</span>
              </div>
              <div class="slot-actions flex flex-column align-items-end gap-1">
                <span class="slot-price">{{ formatBRL(item.priceCents) }}</span>
                <Button
                  icon="pi pi-trash"
                  text
                  rounded
                  severity="danger"
                  size="small"
                  aria-label="Remover"
                  @click="toggleCart(item.id)"
                />
              </div>
            </div>
          </template>
        </Card>

        <Card>
          <template #title>
            <div class="flex justify-content-between align-items-center w-full">
              <span class="font-semibold text-sm">Quem está reservando</span>
              <Button
                v-if="savedCustomer && !editing"
                label="editar"
                link
                size="small"
                @click="editing = true"
              />
            </div>
          </template>
          <template #content>
            <div v-if="savedCustomer && !editing" class="customer-display flex align-items-center gap-3">
              <div class="avatar" :style="{ background: avatarColor }">{{ avatarInitials }}</div>
              <div class="flex flex-column">
                <strong>{{ form.name }}</strong>
                <span class="text-sm text-color-secondary">{{ form.phone }}</span>
              </div>
            </div>
            <div v-else class="flex flex-column gap-3">
              <div class="field">
                <label class="field-label">Nome *</label>
                <InputText v-model="form.name" class="w-full" placeholder="Como você se chama?" />
              </div>
              <div class="field">
                <label class="field-label">WhatsApp *</label>
                <InputMask
                  v-model="form.phone"
                  mask="(99) 99999-9999"
                  class="w-full"
                  placeholder="(51) 99999-9999"
                />
              </div>
              <div class="field">
                <label class="field-label">E-mail <span class="optional">(opcional)</span></label>
                <InputText v-model="form.email" type="email" class="w-full" placeholder="Para receber confirmação" />
              </div>
              <Button v-if="editing && savedCustomer" label="salvar" link size="small" class="align-self-start" @click="saveCustomer" />
            </div>
          </template>
        </Card>

        <Card>
          <template #content>
            <div class="summary-row flex justify-content-between">
              <span>Subtotal · {{ cartItems.length }} horário{{ cartItems.length > 1 ? 's' : '' }}</span>
              <span>{{ formatBRL(cartTotal) }}</span>
            </div>
            <div class="summary-row flex justify-content-between">
              <span>Taxa de serviço</span>
              <span class="text-primary font-medium">Grátis</span>
            </div>
            <Divider />
            <div class="summary-total flex justify-content-between align-items-center">
              <span>Total</span>
              <strong>{{ formatBRL(cartTotal) }}</strong>
            </div>
          </template>
        </Card>

        <p class="policy-text text-center text-sm text-color-secondary m-0 px-2">
          Cancelamento grátis até 4h antes — reembolso integral via PIX em até 1 dia útil.
        </p>

        <Button
          label="Ir para pagamento"
          icon="pi pi-arrow-right"
          iconPos="right"
          fluid
          :disabled="!isValid"
          @click="goToPayment"
        />
      </template>

      <!-- ── Etapa 2: Pagamento ────────────────────────────────────── -->
      <template v-else>
        <p class="payment-heading m-0 font-bold text-lg">Como você quer pagar?</p>

        <div class="payment-options flex flex-column gap-2">
          <button
            type="button"
            class="pay-option"
            :class="{ 'pay-option--active': paymentChoice === 'full' }"
            @click="paymentChoice = 'full'"
          >
            <div class="pay-option-head">
              <span class="pay-option-title">Pagar tudo</span>
              <span class="pay-badge">Recomendado</span>
            </div>
            <span class="pay-option-sub">
              Garante seu horário · {{ formatBRL(amountsFull.dueNowCents) }} via PIX agora
            </span>
          </button>

          <button
            v-if="acceptPayOnSite"
            type="button"
            class="pay-option"
            :class="{ 'pay-option--active': paymentChoice === 'partial' }"
            @click="paymentChoice = 'partial'"
          >
            <span class="pay-option-title">Parcial</span>
            <span class="pay-option-sub">
              {{ depositPct }}% agora ({{ formatBRL(amountsDeposit.dueNowCents) }}) via PIX · restante {{ formatBRL(amountsDeposit.dueOnSiteCents) }} na chegada
            </span>
            <span class="pay-option-hint">50% de cada horário agora; o restante você paga no local</span>
          </button>
        </div>

        <Card>
          <template #content>
            <div class="summary-row flex justify-content-between">
              <span>Paga agora (PIX)</span>
              <strong>{{ formatBRL(selectedAmounts.dueNowCents) }}</strong>
            </div>
            <div class="summary-row flex justify-content-between">
              <span>Na chegada</span>
              <span>{{ selectedAmounts.dueOnSiteCents > 0 ? formatBRL(selectedAmounts.dueOnSiteCents) : 'R$ 0,00' }}</span>
            </div>
            <Divider />
            <div class="summary-total flex justify-content-between align-items-center">
              <span>Total do pedido</span>
              <strong>{{ formatBRL(cartTotal) }}</strong>
            </div>
          </template>
        </Card>

        <Button
          label="Pagar via PIX"
          icon="pi pi-bolt"
          fluid
          :loading="loading"
          :disabled="!isValid || loading"
          @click="confirmPayment"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIntervalFn, useStorage } from '@vueuse/core';

const route = useRoute();
const slug = route.params.slug as string;

const { tenant, cartItems, cartTotal, fetchTenant, createHold, checkout, toggleCart, clearCart } = useReserva();

type Step = 'cart' | 'payment';
const step = ref<Step>('cart');
const paymentChoice = ref<'full' | 'partial'>('full');

const storedName = useStorage('jf_customer_name', '');
const storedPhone = useStorage('jf_customer_phone', '');
const storedEmail = useStorage('jf_customer_email', '');

const form = reactive({
  name: storedName.value,
  phone: storedPhone.value,
  email: storedEmail.value,
});

const savedCustomer = computed(() => form.name.length >= 2 && form.phone.replace(/\D/g, '').length >= 10);
const editing = ref(!savedCustomer.value);

function saveCustomer() {
  storedName.value = form.name;
  storedPhone.value = form.phone;
  storedEmail.value = form.email;
  editing.value = false;
}

const avatarInitials = computed(() => {
  const parts = form.name.trim().split(' ');
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
});

const avatarColor = computed(() => {
  const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];
  const idx = form.name.charCodeAt(0) % colors.length;
  return colors[idx];
});

const HOLD_SECONDS = 10 * 60;
const secondsLeft = ref(HOLD_SECONDS);

const formattedTimer = computed(() => {
  const m = Math.floor(secondsLeft.value / 60);
  const s = secondsLeft.value % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
});

useIntervalFn(() => {
  if (secondsLeft.value > 0) secondsLeft.value--;
}, 1000);

function getDayAbbr(iso: string) {
  if (!iso) return '';
  return format(parseISO(iso), 'EEE', { locale: ptBR }).replace('.', '').toUpperCase().slice(0, 3);
}
function getDayNum(iso: string) {
  if (!iso) return '';
  return format(parseISO(iso), 'dd');
}
function formatFullDate(iso: string) {
  if (!iso) return '';
  return format(parseISO(iso), "EEE dd/MM", { locale: ptBR });
}
function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}
function getResourceName(id: string) {
  return tenant.value?.resources?.find((r: any) => r.id === id)?.name ?? 'Quadra';
}
function getResourceType(id: string) {
  return tenant.value?.resources?.find((r: any) => r.id === id)?.type ?? '';
}
function resourceTypeLabel(type: string) {
  const map: Record<string, string> = {
    society: 'Society 7', padel: 'Padel', beach: 'Beach Tennis',
    tennis: 'Tênis', futsal: 'Futsal',
  };
  return map[type] || type;
}

const isValid = computed(() => form.name.length >= 2 && form.phone.replace(/\D/g, '').length >= 10);

const acceptPayOnSite = computed(() => tenant.value?.settings?.acceptPayOnSite === true);

const depositPct = computed(() => {
  const p = Number(tenant.value?.settings?.depositPercentage);
  return Number.isFinite(p) && p > 0 && p <= 100 ? Math.round(p) : 50;
});

function estimateAmounts(method: 'pix_upfront' | 'deposit_plus_on_site') {
  const count = Math.max(cartItems.value.length, 1);
  const feePerBooking = Number(tenant.value?.settings?.platformFeeCents) || 500;
  const platformFeeCents = feePerBooking * count;
  const total = cartTotal.value;
  const sellerAmountCents =
    method === 'deposit_plus_on_site'
      ? Math.round((total * depositPct.value) / 100)
      : total;
  const dueOnSiteCents = Math.max(total - sellerAmountCents, 0);
  return {
    dueNowCents: sellerAmountCents + platformFeeCents,
    dueOnSiteCents,
    sellerAmountCents,
  };
}

const amountsFull = computed(() => estimateAmounts('pix_upfront'));
const amountsDeposit = computed(() => estimateAmounts('deposit_plus_on_site'));

const selectedAmounts = computed(() =>
  paymentChoice.value === 'partial' ? amountsDeposit.value : amountsFull.value,
);

function onBack() {
  if (step.value === 'payment') {
    step.value = 'cart';
  } else {
    navigateTo(`/r/${slug}/reservar`);
  }
}

function goToPayment() {
  if (!isValid.value) return;
  step.value = 'payment';
  if (!acceptPayOnSite.value) paymentChoice.value = 'full';
}

onMounted(async () => {
  if (!tenant.value) await fetchTenant(slug);
});

const loading = ref(false);

async function confirmPayment() {
  const method = paymentChoice.value === 'partial' ? 'pay_on_site' : 'pix_upfront';
  await confirm(method);
}

async function confirm(method: 'pix_upfront' | 'pay_on_site') {
  if (!isValid.value) return;

  storedName.value = form.name;
  storedPhone.value = form.phone;
  storedEmail.value = form.email;

  loading.value = true;
  try {
    const hold = await createHold(slug, {
      name: form.name,
      phone: form.phone,
      email: form.email || undefined,
    });

    const res = await checkout(slug, {
      bookingIds: hold.bookingIds,
      method,
      customer: { name: form.name, phone: form.phone, email: form.email },
    });

    clearCart();

    if (!res.paymentId) {
      alert('Pagamento online indisponível. Tente novamente ou contate a arena.');
      return;
    }

    navigateTo({
      path: `/r/${slug}/pix`,
      query: {
        paymentId: res.paymentId,
        pixCopiaCola: res.pixCopiaCola || '',
        amountCents: String(res.amountCents ?? 0),
        dueOnSiteCents: String(res.dueOnSiteCents ?? 0),
        totalCents: String(res.totalCents ?? cartTotal.value),
        paymentMode: method === 'pay_on_site' ? 'deposit' : 'full',
        expiresAt: res.expiresAt || '',
        customerName: form.name,
      },
    });
  } catch (err) {
    console.error(err);
    alert('Erro ao processar. Tente novamente.');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.page {
  background: var(--p-surface-50, #f9fafb);
  min-height: 100dvh;
  padding-bottom: 2rem;
}

.header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: var(--p-surface-0);
  border-bottom: 1px solid var(--p-surface-100);
  position: sticky;
  top: 0;
  z-index: 20;
}

h1 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  flex: 1;
}

.timer-msg {
  margin: 0;
  border-radius: 0;
  border-left: none;
  border-right: none;
}

.empty {
  padding: 5rem 1.5rem;
  color: var(--p-text-color-secondary);
}

.empty-icon {
  font-size: 3rem;
  color: var(--p-surface-300);
  margin-bottom: 1rem;
}

.slot-row {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.25rem 0;
}

.slot-row--border {
  padding-bottom: 0.875rem;
  margin-bottom: 0.875rem;
  border-bottom: 1px solid var(--p-surface-100);
}

:deep(.slot-card-wrap .p-card-body) {
  padding: 1rem;
}

.day-badge {
  width: 42px;
  height: 42px;
  background: var(--p-primary-500);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.badge-dow {
  font-size: 0.58rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 0.05em;
  line-height: 1;
}

.badge-num {
  font-size: 1rem;
  font-weight: 800;
  color: white;
  line-height: 1.1;
}

.slot-time {
  font-size: 0.925rem;
  font-weight: 600;
}

.slot-resource,
.slot-date {
  font-size: 0.75rem;
  color: var(--p-text-color-secondary);
  display: block;
}

.slot-date {
  font-size: 0.7rem;
  text-transform: capitalize;
}

.slot-price {
  font-size: 0.95rem;
  font-weight: 700;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
  text-transform: uppercase;
}

.field-label {
  display: block;
  font-size: 0.775rem;
  font-weight: 500;
  color: var(--p-text-color-secondary);
  margin-bottom: 0.35rem;
}

.optional {
  font-weight: 400;
}

.summary-row {
  font-size: 0.875rem;
  color: var(--p-text-color-secondary);
  padding: 0.25rem 0;
}

.summary-total strong {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--p-text-color);
}

.policy-text {
  line-height: 1.5;
}

.payment-heading {
  color: var(--p-text-color);
}

.payment-options {
  width: 100%;
}

.pay-option {
  width: 100%;
  text-align: left;
  padding: 1rem;
  border: 1.5px solid var(--p-surface-200);
  border-radius: 12px;
  background: var(--p-surface-0);
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.pay-option--active {
  border-color: var(--p-primary-500);
  box-shadow: 0 0 0 1px var(--p-primary-500);
}

.pay-option-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.pay-option-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--p-text-color);
  display: block;
}

.pay-badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: var(--p-primary-50, #ecfdf5);
  color: var(--p-primary-700, #047857);
}

.pay-option-sub {
  font-size: 0.8rem;
  color: var(--p-text-color-secondary);
  line-height: 1.4;
  display: block;
}

.pay-option-hint {
  font-size: 0.72rem;
  color: var(--p-surface-500);
  margin-top: 0.35rem;
  display: block;
  line-height: 1.35;
}
</style>
