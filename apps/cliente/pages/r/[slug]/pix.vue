<template>
  <div class="page">
    <header v-if="status === 'pending'" class="header">
      <h1>Pague para confirmar</h1>
      <p class="subtitle">Use o QR Code abaixo ou copie o código.</p>
    </header>

    <div v-if="status === 'pending'" class="container">
      <div class="qr-card">
        <div class="qr-placeholder">
          <i class="pi pi-qrcode"></i>
        </div>
        <p class="qr-amount">{{ formatBRL(cartTotal || 10000) }}</p>
      </div>

      <div class="copia-cola">
        <label>PIX copia e cola</label>
        <div class="code-box">
          <code>{{ pixCode }}</code>
          <button class="copy-btn" @click="copy">
            <i class="pi pi-copy"></i>
          </button>
        </div>
      </div>

      <div class="timer-card">
        <i class="pi pi-clock"></i>
        <div>
          <strong>Expira em {{ formattedTimer }}</strong>
          <span>Aguardando confirmação automática…</span>
        </div>
        <ProgressSpinner style="width: 28px; height: 28px;" strokeWidth="3" />
      </div>

      <details class="help">
        <summary>Como pagar pelo PIX?</summary>
        <ol>
          <li>Abra o app do seu banco</li>
          <li>Escolha pagar via PIX</li>
          <li>Escaneie o QR Code ou cole o código acima</li>
          <li>Confirme o pagamento</li>
        </ol>
      </details>
    </div>

    <div v-else-if="status === 'paid'" class="success">
      <div class="success-icon">
        <i class="pi pi-check-circle"></i>
      </div>
      <h2>Reserva confirmada!</h2>
      <p>Você receberá lembrete por e-mail e WhatsApp.</p>
      <Button label="Ver minhas reservas" outlined @click="navigateTo('/minhas-reservas')" />
    </div>

    <div v-else class="error">
      <i class="pi pi-times-circle"></i>
      <h2>Pagamento expirado</h2>
      <p>Tente novamente.</p>
      <Button :label="`Voltar`" @click="$router.go(-2)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import { useIntervalFn } from '@vueuse/core';

const route = useRoute();
const slug = route.params.slug as string;
const paymentId = route.query.paymentId as string;

const { cartTotal, clearCart, pollPayment } = useReserva();

const status = ref<'pending' | 'paid' | 'expired' | 'failed'>('pending');
const pixCode = ref(
  '00020126360014BR.GOV.BCB.PIX0114agendaslim@example52040000530398654041.005802BR5925AGENDA SLIM PAGAMENTOS6009SAO PAULO62070503***6304ABCD',
);
const secondsLeft = ref(15 * 60);

const formattedTimer = computed(() => {
  const m = Math.floor(secondsLeft.value / 60);
  const s = secondsLeft.value % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
});

const { pause: pauseTimer } = useIntervalFn(() => {
  if (secondsLeft.value > 0) secondsLeft.value--;
  else {
    status.value = 'expired';
    pauseTimer();
  }
}, 1000);

// Poll a cada 2s
const { pause: pausePoll } = useIntervalFn(async () => {
  if (!paymentId) return;
  try {
    const newStatus = await pollPayment(paymentId);
    if (newStatus === 'paid') {
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
    console.error('Erro polling:', err);
  }
}, 2000);

async function copy() {
  await navigator.clipboard.writeText(pixCode.value);
}

function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}
</script>

<style scoped>
.page { padding: 1.5rem; padding-bottom: 2rem; }

.header { text-align: center; margin-bottom: 1.5rem; }
h1 { margin: 0; font-size: 1.25rem; font-weight: 600; }
.subtitle { margin: 0.25rem 0 0; font-size: 0.9rem; color: var(--p-text-color-secondary); }

.container { display: flex; flex-direction: column; gap: 1rem; }

.qr-card {
  background: var(--p-surface-50);
  border-radius: 1rem;
  padding: 2rem;
  text-align: center;
  border: 2px dashed var(--p-surface-200);
}
.qr-placeholder {
  width: 200px; height: 200px;
  margin: 0 auto 1rem;
  background: white;
  border-radius: 0.5rem;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--p-surface-200);
}
.qr-placeholder i {
  font-size: 6rem;
  color: var(--p-text-color);
}
.qr-amount {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--p-primary-700);
  margin: 0;
}

.copia-cola { display: flex; flex-direction: column; gap: 0.375rem; }
.copia-cola label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--p-text-color-secondary);
}
.code-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.5rem;
  padding: 0.625rem 0.875rem;
}
.code-box code {
  flex: 1;
  font-size: 0.8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Courier New', monospace;
}
.copy-btn {
  background: var(--p-primary-500);
  color: white;
  border: none;
  border-radius: 0.375rem;
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  font-size: 0.95rem;
}

.timer-card {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  background: var(--p-primary-50);
  border-radius: 0.75rem;
  padding: 1rem;
}
.timer-card > i {
  font-size: 1.5rem;
  color: var(--p-primary-600);
}
.timer-card div {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.timer-card strong { font-size: 0.95rem; color: var(--p-primary-800); }
.timer-card span { font-size: 0.8rem; color: var(--p-text-color-secondary); }

.help {
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.75rem;
  padding: 1rem;
}
.help summary {
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--p-text-color);
}
.help ol {
  margin: 0.75rem 0 0;
  padding-left: 1.5rem;
  font-size: 0.85rem;
  color: var(--p-text-color-secondary);
  line-height: 1.7;
}

.success, .error {
  text-align: center;
  padding: 3rem 1rem;
}
.success-icon {
  display: inline-flex;
  align-items: center; justify-content: center;
  width: 96px; height: 96px;
  background: var(--p-primary-100);
  color: var(--p-primary-600);
  border-radius: 50%;
  font-size: 3rem;
  margin-bottom: 1rem;
}
.success h2, .error h2 { margin: 0 0 0.5rem; font-size: 1.4rem; }
.success p, .error p {
  margin: 0 0 2rem;
  color: var(--p-text-color-secondary);
  font-size: 0.95rem;
}

.error i {
  display: block;
  font-size: 4rem;
  color: var(--p-red-500, #EF4444);
  margin-bottom: 1rem;
}
</style>
