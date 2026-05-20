<template>
  <div class="page">
    <header class="header">
      <button class="back" @click="$router.back()"><i class="pi pi-arrow-left"></i></button>
      <h1>Confirmar reserva</h1>
    </header>

    <div v-if="cartItems.length === 0" class="empty">
      <i class="pi pi-shopping-cart"></i>
      <p>Seu carrinho está vazio.</p>
      <Button label="Escolher horários" @click="$router.push(`/r/${slug}/reservar`)" />
    </div>

    <div v-else class="container">
      <!-- Resumo -->
      <section class="block">
        <h2 class="block-title">Resumo</h2>
        <div class="summary">
          <div v-for="item in cartItems" :key="item.id" class="item">
            <div class="item-info">
              <strong>{{ item.time }}</strong>
              <span>{{ formatDay(item.startsAt) }}</span>
            </div>
            <span class="item-price">{{ formatBRL(item.priceCents) }}</span>
          </div>
          <div class="total">
            <strong>Total</strong>
            <strong class="total-value">{{ formatBRL(cartTotal) }}</strong>
          </div>
        </div>
      </section>

      <!-- Identificação -->
      <section class="block">
        <h2 class="block-title">Seus dados</h2>
        <div class="field">
          <label>Nome *</label>
          <InputText v-model="form.name" placeholder="Como você se chama?" class="w-full" />
        </div>
        <div class="field">
          <label>WhatsApp *</label>
          <InputMask v-model="form.phone" mask="(99) 99999-9999" placeholder="(51) 99999-9999" class="w-full" />
        </div>
        <div class="field">
          <label>E-mail (opcional)</label>
          <InputText v-model="form.email" type="email" placeholder="Pra receber confirmação" class="w-full" />
        </div>
      </section>

      <!-- Forma de pagamento -->
      <section v-if="tenant" class="block">
        <h2 class="block-title">Como você quer pagar?</h2>
        <div class="payment-options">
          <label class="option" :class="{ active: form.method === 'pix_upfront' }">
            <input v-model="form.method" type="radio" value="pix_upfront" />
            <div class="opt-content">
              <strong>Pagar agora via PIX</strong>
              <p>Reserva garantida imediatamente.</p>
            </div>
            <i class="pi pi-bolt opt-icon"></i>
          </label>
          <label v-if="tenant.settings?.acceptPayOnSite" class="option" :class="{ active: form.method === 'pay_on_site' }">
            <input v-model="form.method" type="radio" value="pay_on_site" />
            <div class="opt-content">
              <strong>Pagar na chegada</strong>
              <p>Sujeito à aprovação do estabelecimento.</p>
            </div>
            <i class="pi pi-clock opt-icon"></i>
          </label>
        </div>
      </section>

      <Button
        :label="form.method === 'pix_upfront' ? 'Gerar PIX' : 'Solicitar reserva'"
        icon="pi pi-check"
        size="large"
        class="confirm-btn"
        :loading="loading"
        :disabled="!isValid"
        @click="confirm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputMask from 'primevue/inputmask';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const route = useRoute();
const slug = route.params.slug as string;

const { tenant, cartItems, cartTotal, fetchTenant, createHold, checkout } = useReserva();

const form = reactive({
  name: '',
  phone: '',
  email: '',
  method: 'pix_upfront' as 'pix_upfront' | 'pay_on_site',
});

const loading = ref(false);

onMounted(async () => {
  if (!tenant.value) await fetchTenant(slug);
});

const isValid = computed(() => form.name.length >= 2 && form.phone.length >= 10);

async function confirm() {
  if (!isValid.value) return;
  loading.value = true;
  try {
    const hold = await createHold(slug, {
      name: form.name,
      phone: form.phone,
      email: form.email || undefined,
    });
    const res = await checkout(slug, {
      holdId: hold.holdId,
      method: form.method,
      customer: { name: form.name, phone: form.phone, email: form.email },
    });

    if (form.method === 'pix_upfront') {
      navigateTo({
        path: `/r/${slug}/pix`,
        query: {
          paymentId: res.paymentId,
          pixCopiaCola: res.pixCopiaCola || '',
          amountCents: String(res.amountCents || res.totalCents || ''),
          expiresAt: res.expiresAt || '',
        },
      });
    } else {
      navigateTo({ path: `/r/${slug}/aguardando`, query: { bookingId: res.bookingId } });
    }
  } catch (err) {
    console.error(err);
    alert('Erro ao processar reserva. Tente novamente.');
  } finally {
    loading.value = false;
  }
}

function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatDay(iso: string) {
  return format(parseISO(iso), "EEEE, dd 'de' MMM", { locale: ptBR });
}
</script>

<style scoped>
.page { padding-bottom: 2rem; }

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
h1 { margin: 0; font-size: 1.05rem; font-weight: 600; }

.empty {
  padding: 4rem 1.5rem;
  text-align: center;
  color: var(--p-text-color-secondary);
}
.empty i { font-size: 3rem; color: var(--p-surface-400); margin-bottom: 1rem; display: block; }
.empty p { font-size: 0.95rem; margin: 0 0 1.5rem; }

.container { padding: 1rem 1rem 2rem; display: flex; flex-direction: column; gap: 1rem; }

.block {
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-100);
  border-radius: 1.25rem;
  padding: 1.25rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
}
.block-title {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 0.875rem;
  color: var(--p-text-color);
}

.summary { display: flex; flex-direction: column; }
.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.625rem 0;
  border-bottom: 1px solid var(--p-surface-100);
}
.item:last-child { border-bottom: none; }
.item-info { display: flex; flex-direction: column; }
.item-info strong { font-size: 0.95rem; }
.item-info span {
  font-size: 0.8rem;
  color: var(--p-text-color-secondary);
  text-transform: capitalize;
}
.item-price { font-weight: 600; color: var(--p-primary-700); }
.total {
  display: flex; justify-content: space-between;
  padding: 0.875rem 0 0;
  border-top: 2px solid var(--p-surface-200);
  margin-top: 0.5rem;
}
.total-value { color: var(--p-primary-700); font-size: 1.1rem; }

.field {
  display: flex; flex-direction: column; gap: 0.375rem;
  margin-bottom: 0.75rem;
}
.field:last-child { margin-bottom: 0; }
.field label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--p-text-color-secondary);
}

.payment-options { display: flex; flex-direction: column; gap: 0.5rem; }
.option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1.5px solid var(--p-surface-200);
  border-radius: 0.75rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.15s;
}
.option.active {
  border-color: var(--p-primary-500);
  background: var(--p-primary-50);
}
.option input { accent-color: var(--p-primary-500); }
.opt-content { flex: 1; }
.opt-content strong { display: block; font-size: 0.95rem; }
.opt-content p { margin: 0.25rem 0 0; font-size: 0.8rem; color: var(--p-text-color-secondary); }
.opt-icon {
  font-size: 1.25rem;
  color: var(--p-primary-500);
}

.confirm-btn { width: 100%; border-radius: 12px; font-weight: 600; }
.w-full { width: 100%; }
</style>
