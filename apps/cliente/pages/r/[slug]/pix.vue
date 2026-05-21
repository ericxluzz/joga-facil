<template>
  <div class="page">

    <!-- ── PENDING ──────────────────────────────────── -->
    <template v-if="status === 'pending'">
      <header class="header">
        <div class="header-text">
          <h1>{{ isDeposit ? 'Pague o sinal via PIX' : 'Pague para confirmar' }}</h1>
          <p v-if="isDeposit">
            Sinal agora · restante {{ formatBRL(dueOnSiteCents) }} na chegada
          </p>
          <p v-else>Use o QR Code ou copie o código PIX — garante seu horário</p>
        </div>
        <!-- Amount badge -->
        <div class="amount-badge">{{ formatBRL(amountCents ?? 0) }}</div>
      </header>

      <div class="container flex flex-column gap-3 p-3">
        <Card>
          <template #content>
            <div class="qr-box flex align-items-center justify-content-center">
              <i class="pi pi-qrcode qr-icon" />
            </div>
          </template>
        </Card>

        <Card>
          <template #title>
            <span class="text-sm font-semibold">PIX copia e cola</span>
          </template>
          <template #content>
            <div class="copy-row flex align-items-center gap-2">
              <code class="pix-code flex-1">{{ pixCode || '…' }}</code>
              <Button
                :label="copied ? 'Copiado!' : 'Copiar'"
                :icon="copied ? 'pi pi-check' : 'pi pi-copy'"
                outlined
                size="small"
                @click="copy"
              />
            </div>
          </template>
        </Card>

        <!-- Timer -->
        <div class="timer-card" :class="{ urgent: secondsLeft < 120 }">
          <div class="timer-left">
            <i class="pi pi-clock" />
            <div>
              <strong>Expira em {{ formattedTimer }}</strong>
              <span>Aguardando confirmação automática…</span>
            </div>
          </div>
          <div class="timer-spinner">
            <svg viewBox="0 0 36 36" class="spinner-svg">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" stroke-opacity="0.15" stroke-width="2.5" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke="currentColor" stroke-width="2.5"
                stroke-dasharray="100" stroke-dashoffset="25"
                stroke-linecap="round"
                :style="{ transform: `rotate(-90deg)`, transformOrigin: 'center', strokeDashoffset: timerDashoffset }"
              />
            </svg>
          </div>
        </div>

        <!-- Steps -->
        <details class="help-card">
          <summary>Como pagar pelo PIX?</summary>
          <ol>
            <li>Abra o app do seu banco</li>
            <li>Escolha pagar via <strong>PIX copia e cola</strong></li>
            <li>Cole o código copiado acima</li>
            <li>Confirme o valor e pague</li>
          </ol>
        </details>
      </div>
    </template>

    <!-- ── PAID / CONFIRMED ──────────────────────────── -->
    <template v-else-if="status === 'paid'">
      <div class="confirm-page">
        <!-- Check -->
        <div class="confirm-check">
          <div class="check-circle">
            <i class="pi pi-check" />
          </div>
          <h1>Reserva confirmada!</h1>
          <p class="confirm-sub">
            PIX do sinal recebido · {{ formatBRL(amountCents ?? 0) }}
            <template v-if="dueOnSiteCents > 0"> · restante {{ formatBRL(dueOnSiteCents) }} na chegada</template>
          </p>
        </div>

        <Card v-if="confirmedItems.length" class="booking-card">
          <template #content>
          <div class="booking-header">
            <div class="booking-logo" v-if="tenant?.settings?.logoUrl" :style="{ backgroundImage: `url(${tenant.settings.logoUrl})` }" />
            <div class="booking-est">
              <strong>{{ tenant?.name }}</strong>
              <span v-if="tenant?.address">{{ tenant.address }}</span>
            </div>
            <a v-if="tenant?.settings?.whatsapp" :href="`https://wa.me/${tenant.settings.whatsapp}`" class="wa-link" target="_blank">
              <i class="pi pi-whatsapp" /> Contato
            </a>
          </div>

          <div class="booking-divider" />

          <!-- Slot items -->
          <div class="booking-items">
            <div v-for="item in confirmedItems" :key="item.id" class="booking-item">
              <div class="bi-badge">
                <span class="bi-dow">{{ getDayAbbr(item.startsAt) }}</span>
                <span class="bi-day">{{ getDayNum(item.startsAt) }}</span>
              </div>
              <div class="bi-info">
                <span class="bi-time">{{ item.time }}</span>
                <span class="bi-resource">{{ getResourceName(item.resourceId) }}</span>
              </div>
              <span class="bi-price">{{ formatBRL(item.priceCents) }}</span>
            </div>
          </div>

          <div class="booking-divider" />

          <!-- Totals row -->
          <div class="booking-footer">
            <span class="booking-codes">Códigos: #{{ shortCode(0) }} · #{{ shortCode(1) }}</span>
            <div class="booking-total">
              Total · <strong>{{ formatBRL(amountCents ?? 0) }}</strong>
            </div>
          </div>
          </template>
        </Card>

        <Message severity="success" :closable="false" class="reminder-msg">
          Você receberá um lembrete por <strong>e-mail e push 2 horas antes</strong> de cada jogo.
        </Message>

        <!-- Actions -->
        <Button
          label="Adicionar à agenda do celular"
          icon="pi pi-calendar-plus"
          outlined
          fluid
          @click="addToCalendar"
        />
        <Button
          label="Ver minhas reservas"
          severity="secondary"
          fluid
          @click="navigateTo('/minhas-reservas')"
        />
      </div>
    </template>

    <!-- ── EXPIRED / FAILED ──────────────────────────── -->
    <template v-else>
      <div class="state-center">
        <div class="error-icon"><i class="pi pi-times-circle" /></div>
        <h2>Pagamento expirado</h2>
        <p>O tempo para pagamento foi esgotado.<br>Tente novamente.</p>
        <Button
          label="Tentar novamente"
          severity="danger"
          outlined
          @click="$router.go(-2)"
        />
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const route = useRoute();
const slug = route.params.slug as string;
const paymentId = route.query.paymentId as string;
const pixCopiaCola = route.query.pixCopiaCola as string | undefined;
const amountCents = route.query.amountCents ? Number(route.query.amountCents) : undefined;
const dueOnSiteCents = route.query.dueOnSiteCents ? Number(route.query.dueOnSiteCents) : 0;
const totalCents = route.query.totalCents ? Number(route.query.totalCents) : undefined;
const isDeposit = computed(() => route.query.paymentMode === 'deposit' || dueOnSiteCents > 0);
const expiresAt = route.query.expiresAt as string | undefined;

const { tenant, cartItems, cartTotal, clearCart, pollPayment, fetchTenant } = useReserva();

// Save items before they get cleared
const confirmedItems = ref<any[]>([]);

const status = ref<'pending' | 'paid' | 'expired' | 'failed'>('pending');
const pixCode = ref(pixCopiaCola || '');
const copied = ref(false);

// Timer
const initialSeconds = expiresAt
  ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  : 15 * 60;
const secondsLeft = ref(initialSeconds);

const formattedTimer = computed(() => {
  const m = Math.floor(secondsLeft.value / 60);
  const s = secondsLeft.value % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
});

const timerDashoffset = computed(() => {
  const progress = secondsLeft.value / initialSeconds;
  return (1 - progress) * 100;
});

const { pause: pauseTimer } = useIntervalFn(() => {
  if (secondsLeft.value > 0) secondsLeft.value--;
  else { status.value = 'expired'; pauseTimer(); }
}, 1000);

// Poll payment
const { pause: pausePoll } = useIntervalFn(async () => {
  if (!paymentId) return;
  try {
    const newStatus = await pollPayment(paymentId);
    if (newStatus === 'paid') {
      confirmedItems.value = [...cartItems.value];
      status.value = 'paid';
      clearCart();
      pausePoll();
      pauseTimer();
    } else if (newStatus === 'expired' || newStatus === 'failed') {
      status.value = newStatus;
      pausePoll();
      pauseTimer();
    }
  } catch (err) {
    console.error(err);
  }
}, 2000);

onMounted(async () => {
  if (!tenant.value) await fetchTenant(slug);
  confirmedItems.value = [...cartItems.value];
});

async function copy() {
  try {
    await navigator.clipboard.writeText(pixCode.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {}
}

function addToCalendar() {
  // Native share / ICS would go here
  alert('Em breve: adicionar à agenda!');
}

function shortCode(index: number) {
  const item = confirmedItems.value[index];
  if (!item) return 'XXXX';
  return 'A' + item.id.replace(/-/g, '').slice(0, 4).toUpperCase();
}

function getDayAbbr(iso: string) {
  if (!iso) return '';
  return format(parseISO(iso), 'EEE', { locale: ptBR }).replace('.', '').toUpperCase().slice(0, 3);
}
function getDayNum(iso: string) {
  if (!iso) return '';
  return format(parseISO(iso), 'dd');
}
function getResourceName(id: string) {
  return tenant.value?.resources?.find((r: any) => r.id === id)?.name ?? 'Quadra';
}
function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}
</script>

<style scoped>
.page { min-height: 100dvh; background: var(--p-surface-50, #f9fafb); }

/* ── Pending header ─────────── */
.header {
  background: var(--p-surface-0);
  padding: 1.5rem 1.25rem 1.25rem;
  display: flex; justify-content: space-between; align-items: flex-start;
  border-bottom: 1px solid var(--p-surface-100);
}
.header-text h1 { margin: 0; font-size: 1.1rem; font-weight: 700; }
.header-text p { margin: 0.2rem 0 0; font-size: 0.8rem; color: var(--p-text-color-secondary); }
.amount-badge {
  background: var(--p-primary-500);
  color: white;
  padding: 0.375rem 0.875rem;
  border-radius: 999px;
  font-size: 0.95rem; font-weight: 700;
  flex-shrink: 0;
}

.qr-box {
  width: 180px;
  height: 180px;
  margin: 0 auto;
  background: white;
  border: 1.5px dashed var(--p-surface-300);
  border-radius: 1rem;
}

.qr-icon {
  font-size: 5rem;
  color: var(--p-text-color);
}

.pix-code {
  font-size: 0.72rem;
  color: var(--p-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: monospace;
}

/* Timer */
.timer-card {
  display: flex; align-items: center; justify-content: space-between;
  gap: 0.875rem;
  background: #ECFDF5;
  border: 1px solid #A7F3D0;
  border-radius: 1rem;
  padding: 0.875rem 1rem;
}
.timer-card.urgent { background: #FEF3C7; border-color: #FDE68A; }
.timer-card.urgent .timer-left i,
.timer-card.urgent .timer-left strong { color: #92400E; }
.timer-card.urgent .timer-spinner { color: #D97706; }
.timer-left { display: flex; align-items: center; gap: 0.75rem; flex: 1; }
.timer-left i { font-size: 1.25rem; color: var(--p-primary-600); }
.timer-left div { display: flex; flex-direction: column; gap: 0.1rem; }
.timer-left strong { font-size: 0.9rem; color: #065F46; }
.timer-left span { font-size: 0.75rem; color: var(--p-text-color-secondary); }
.timer-spinner { width: 36px; height: 36px; color: var(--p-primary-500); flex-shrink: 0; }
.spinner-svg { width: 100%; height: 100%; animation: spin-timer 1s linear infinite; }
@keyframes spin-timer { from { transform: rotate(-90deg); } to { transform: rotate(270deg); } }

/* Help */
.help-card {
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-100);
  border-radius: 1rem;
  padding: 1rem;
}
.help-card summary {
  cursor: pointer; font-size: 0.875rem; font-weight: 600;
  color: var(--p-text-color); list-style: none;
  display: flex; align-items: center;
}
.help-card summary::after {
  content: '›';
  margin-left: auto; font-size: 1.2rem; color: var(--p-text-color-secondary);
}
.help-card[open] summary::after { transform: rotate(90deg); }
.help-card ol {
  margin: 0.75rem 0 0;
  padding-left: 1.25rem;
  font-size: 0.85rem; color: var(--p-text-color-secondary); line-height: 1.7;
}
.help-card li strong { color: var(--p-text-color); }

/* ── Confirmation ─────────── */
.confirm-page {
  padding: 0 0.875rem 2rem;
  display: flex; flex-direction: column; gap: 0.875rem;
}

.confirm-check {
  text-align: center;
  padding: 2.5rem 1rem 1.5rem;
}
.check-circle {
  width: 72px; height: 72px;
  background: var(--p-primary-500);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 1.125rem;
  font-size: 1.75rem; color: white;
  box-shadow: 0 8px 24px rgba(16,185,129,0.35);
}
.confirm-check h1 { margin: 0; font-size: 1.5rem; font-weight: 800; }
.confirm-sub { margin: 0.25rem 0 0; font-size: 0.9rem; color: var(--p-text-color-secondary); }

/* Booking card */
.booking-card {
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-100);
  border-radius: 1.125rem;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}

.booking-header {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 1rem;
}
.booking-logo {
  width: 40px; height: 40px; border-radius: 8px;
  background-size: cover; background-position: center;
  flex-shrink: 0;
  border: 1px solid var(--p-surface-100);
}
.booking-est { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.booking-est strong { font-size: 0.875rem; font-weight: 700; }
.booking-est span { font-size: 0.75rem; color: var(--p-text-color-secondary); }
.wa-link {
  display: flex; align-items: center; gap: 0.3rem;
  text-decoration: none; font-size: 0.78rem; font-weight: 600;
  color: #166534; background: #DCFCE7;
  padding: 0.35rem 0.75rem;
  border-radius: 999px; flex-shrink: 0;
}

.booking-divider { height: 1px; background: var(--p-surface-100); }

.booking-items { display: flex; flex-direction: column; }
.booking-item {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-50);
}
.booking-item:last-child { border-bottom: none; }

.bi-badge {
  width: 36px; height: 36px;
  background: var(--p-primary-50);
  border-radius: 8px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.bi-dow { font-size: 0.55rem; font-weight: 700; color: var(--p-primary-700); line-height: 1; letter-spacing: 0.04em; }
.bi-day { font-size: 0.95rem; font-weight: 800; color: var(--p-primary-800); line-height: 1.1; }

.bi-info { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; }
.bi-time { font-size: 0.875rem; font-weight: 600; }
.bi-resource { font-size: 0.75rem; color: var(--p-text-color-secondary); }
.bi-price { font-size: 0.875rem; font-weight: 600; color: var(--p-text-color); }

.booking-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.75rem 1rem;
}
.booking-codes { font-size: 0.72rem; color: var(--p-surface-400); }
.booking-total { font-size: 0.78rem; color: var(--p-text-color-secondary); }
.booking-total strong { color: var(--p-text-color); font-size: 0.9rem; }

.reminder-msg {
  margin: 0;
}

/* ── Error state ──── */
.state-center {
  min-height: 100dvh;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 2rem 1.5rem; text-align: center;
}
.error-icon { font-size: 4rem; color: #EF4444; margin-bottom: 1rem; }
.state-center h2 { margin: 0 0 0.5rem; font-size: 1.35rem; }
.state-center p { margin: 0 0 2rem; color: var(--p-text-color-secondary); font-size: 0.9rem; line-height: 1.5; }
</style>
