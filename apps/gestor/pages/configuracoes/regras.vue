<template>
  <div class="config-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Regras de Reserva</h1>
        <p class="page-subtitle">Configure como sua agenda se comporta para o cliente final.</p>
      </div>
    </header>

    <div v-if="loading" class="loading-state">
      <Skeleton width="100%" height="180px" class="mb-3" v-for="i in 3" :key="i" />
    </div>

    <form v-else @submit.prevent="save" class="form-grid">
      <Card class="form-card">
        <template #title>Identificação do cliente</template>
        <template #content>
          <div class="toggle-row">
            <div class="toggle-info">
              <label>Exigir cadastro</label>
              <p class="rule-hint">
                Quando ligado, o cliente precisa criar uma conta para reservar. Recomendado para clínicas.
                Para society/quadras, geralmente desligado.
              </p>
            </div>
            <ToggleSwitch v-model="form.settings.requireRegistration" />
          </div>
        </template>
      </Card>

      <Card class="form-card">
        <template #title>Janela de reserva</template>
        <template #content>
          <div class="field-row">
            <div class="field">
              <label>Antecedência mínima</label>
              <InputNumber v-model="form.settings.minAdvanceMinutes" :min="0" :step="15" suffix=" min" class="w-full" />
              <small class="rule-hint">Tempo mínimo antes do horário (ex: 60 = não aceita reserva pra menos de 1h).</small>
            </div>
            <div class="field">
              <label>Antecedência máxima</label>
              <InputNumber v-model="form.settings.maxAdvanceDays" :min="1" :max="365" suffix=" dias" class="w-full" />
              <small class="rule-hint">Janela futura visível pro cliente (ex: 30 = mostra próximos 30 dias).</small>
            </div>
          </div>
        </template>
      </Card>

      <Card class="form-card">
        <template #title>Carrinho & pagamento</template>
        <template #content>
          <div class="field">
            <label>Tempo de hold no carrinho</label>
            <InputNumber v-model="form.settings.holdMinutes" :min="3" :max="30" suffix=" min" class="w-full" />
            <small class="rule-hint">
              Slot fica reservado pro cliente enquanto ele paga. Padrão: 10min.
            </small>
          </div>

          <div class="toggle-row">
            <div class="toggle-info">
              <label>Aceitar "pagar na chegada"</label>
              <p class="rule-hint">
                Cliente pode reservar sem PIX antecipado. Reserva fica pendente até você aprovar.
                <strong>Atenção:</strong> aumenta no-show.
              </p>
            </div>
            <ToggleSwitch v-model="form.settings.acceptPayOnSite" />
          </div>

          <div v-if="form.settings.acceptPayOnSite" class="field">
            <label>Timeout pagar na chegada</label>
            <InputNumber v-model="form.settings.payOnSiteTimeoutMinutes" :min="5" :max="240" suffix=" min" class="w-full" />
            <small class="rule-hint">
              Se você não aprovar nesse tempo, a reserva é cancelada automaticamente.
            </small>
          </div>
        </template>
      </Card>

      <Card class="form-card">
        <template #title>Política de cancelamento</template>
        <template #content>
          <div class="field">
            <label>Texto exibido pro cliente</label>
            <Textarea v-model="form.settings.cancellationPolicy" rows="4" class="w-full" />
            <small class="rule-hint">
              Aparece na landing pública e no e-mail de confirmação. Cancelamento self-service será liberado na fase 2.
            </small>
          </div>
        </template>
      </Card>

      <div class="actions-row">
        <Button label="Restaurar padrões" severity="secondary" outlined type="button" @click="resetDefaults" />
        <Button label="Salvar alterações" icon="pi pi-check" type="submit" :loading="saving" />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import ToggleSwitch from 'primevue/toggleswitch';
import Skeleton from 'primevue/skeleton';

definePageMeta({ layout: 'default' });

const { tenant, loading, fetchTenant, updateSettings } = useTenant();
const toast = useToast?.();
const saving = ref(false);

const form = reactive<{ settings: any }>({
  settings: {
    requireRegistration: false,
    acceptPayOnSite: true,
    minAdvanceMinutes: 60,
    maxAdvanceDays: 30,
    holdMinutes: 10,
    payOnSiteTimeoutMinutes: 60,
    cancellationPolicy: '',
  },
});

const defaults = {
  requireRegistration: false,
  acceptPayOnSite: true,
  minAdvanceMinutes: 60,
  maxAdvanceDays: 30,
  holdMinutes: 10,
  payOnSiteTimeoutMinutes: 60,
  cancellationPolicy:
    'Cancelamentos com mais de 24h de antecedência são reembolsados integralmente.',
};

onMounted(async () => {
  await fetchTenant();
  if (tenant.value?.settings) {
    form.settings = { ...defaults, ...tenant.value.settings };
  }
});

function resetDefaults() {
  form.settings = { ...defaults };
  toast?.add?.({ severity: 'info', summary: 'Padrões restaurados', detail: 'Não esqueça de salvar.', life: 2500 });
}

async function save() {
  saving.value = true;
  try {
    await updateSettings(form.settings);
    toast?.add?.({ severity: 'success', summary: 'Salvo!', detail: 'Regras atualizadas.', life: 2500 });
  } catch (err) {
    toast?.add?.({ severity: 'error', summary: 'Erro', detail: 'Não foi possível salvar.', life: 4000 });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.config-page { width: 100%; }
.page-header { margin-bottom: 2rem; }
.page-title { margin: 0; font-size: 1.5rem; font-weight: 700; color: var(--p-text-color); }
.page-subtitle { margin: 0.25rem 0 0; color: var(--p-text-color-secondary); font-size: 0.9rem; }

.form-grid { display: flex; flex-direction: column; gap: 1rem; }
.form-card :deep(.p-card-body) { padding: 1.5rem; }

.field { display: flex; flex-direction: column; gap: 0.375rem; margin-bottom: 1rem; }
.field:last-child { margin-bottom: 0; }
.field label { font-size: 0.85rem; font-weight: 500; color: var(--p-text-color); }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

.toggle-row {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 1rem; padding: 0.5rem 0; margin-bottom: 1rem;
}
.toggle-row:last-child { margin-bottom: 0; }
.toggle-info { flex: 1; }
.toggle-info label { font-size: 0.95rem; font-weight: 500; color: var(--p-text-color); }
.rule-hint { font-size: 0.8rem; color: var(--p-text-color-secondary); margin: 0.25rem 0 0; line-height: 1.45; }

.actions-row { display: flex; justify-content: flex-end; gap: 0.5rem; }

.mb-3 { margin-bottom: 0.75rem; }
.w-full { width: 100%; }

@media (max-width: 768px) {
  .field-row { grid-template-columns: 1fr; }
}
</style>
