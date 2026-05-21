<template>
  <div class="config-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Regras de Reserva</h1>
        <p class="page-subtitle">Como sua agenda se comporta para o cliente final.</p>
      </div>
      <div class="header-actions">
        <Button v-if="!editing" label="Editar" icon="pi pi-pencil" @click="startEditing" />
        <template v-else>
          <Button label="Cancelar" severity="secondary" outlined @click="cancelEditing" />
          <Button label="Salvar" icon="pi pi-check" @click="save" :loading="saving" />
        </template>
      </div>
    </header>

    <SectionSkeleton v-if="loading" variant="card" :height="200" />

    <form v-else @submit.prevent="save" class="form-grid">
      <EditableSection :editing="editing" title="Identificação do cliente">
        <template #view>
          <div class="view-field">
            <span class="view-field-label">Exigir cadastro</span>
            <span class="view-field-value">{{ form.settings.requireRegistration ? 'Sim, o cliente precisa criar conta' : 'Não — checkout direto' }}</span>
          </div>
        </template>
        <template #edit>
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
      </EditableSection>

      <EditableSection :editing="editing" title="Janela de reserva">
        <template #view>
          <div class="view-field">
            <span class="view-field-label">Antecedência mínima</span>
            <span class="view-field-value">{{ form.settings.minAdvanceMinutes }} minutos</span>
          </div>
          <div class="view-field">
            <span class="view-field-label">Antecedência máxima</span>
            <span class="view-field-value">{{ form.settings.maxAdvanceDays }} dias</span>
          </div>
        </template>
        <template #edit>
          <div class="field-row">
            <div class="field">
              <label>Antecedência mínima</label>
              <InputNumber
                v-model="form.settings.minAdvanceMinutes"
                :min="0"
                :step="15"
                suffix=" min"
                class="w-full"
              />
              <small class="rule-hint">Tempo mínimo antes do horário (ex: 60 = não aceita reserva pra menos de 1h).</small>
            </div>
            <div class="field">
              <label>Antecedência máxima</label>
              <InputNumber
                v-model="form.settings.maxAdvanceDays"
                :min="1"
                :max="365"
                suffix=" dias"
                class="w-full"
              />
              <small class="rule-hint">Janela futura visível pro cliente (ex: 30 = mostra próximos 30 dias).</small>
            </div>
          </div>
        </template>
      </EditableSection>

      <EditableSection :editing="editing" title="Carrinho & pagamento">
        <template #view>
          <div class="view-field">
            <span class="view-field-label">Hold no carrinho</span>
            <span class="view-field-value">{{ form.settings.holdMinutes }} minutos</span>
          </div>
          <div class="view-field">
            <span class="view-field-label">Sinal + restante na chegada</span>
            <span class="view-field-value">{{ form.settings.acceptPayOnSite ? `Aceito (sinal ${form.settings.depositPercentage ?? 50}%)` : 'Não aceito' }}</span>
          </div>
          <div v-if="form.settings.acceptPayOnSite" class="view-field">
            <span class="view-field-label">Timeout aprovação na chegada</span>
            <span class="view-field-value">{{ form.settings.payOnSiteTimeoutMinutes }} minutos</span>
          </div>
        </template>
        <template #edit>
          <div class="field">
            <label>Tempo de hold no carrinho</label>
            <InputNumber
              v-model="form.settings.holdMinutes"
              :min="3"
              :max="30"
              suffix=" min"
              class="w-full"
            />
            <small class="rule-hint">
              Slot fica reservado pro cliente enquanto ele paga. Padrão: 10min.
            </small>
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <label>Permitir sinal + restante na chegada</label>
              <p class="rule-hint">
                Cliente paga o sinal ({{ form.settings.depositPercentage ?? 50 }}%) via PIX agora e o restante no dia do jogo.
                A opção principal continua sendo pagamento antecipado integral.
              </p>
            </div>
            <ToggleSwitch v-model="form.settings.acceptPayOnSite" />
          </div>
          <div v-if="form.settings.acceptPayOnSite" class="field">
            <label>Timeout pagar na chegada</label>
            <InputNumber
              v-model="form.settings.payOnSiteTimeoutMinutes"
              :min="5"
              :max="240"
              suffix=" min"
              class="w-full"
            />
            <small class="rule-hint">
              Se você não aprovar nesse tempo, a reserva é cancelada automaticamente.
            </small>
          </div>
        </template>
      </EditableSection>

      <EditableSection :editing="editing" title="Política de cancelamento">
        <template #view>
          <div class="view-field">
            <span class="view-field-label">Texto exibido ao cliente</span>
            <span class="view-field-value" :class="{ muted: !form.settings.cancellationPolicy }">
              {{ form.settings.cancellationPolicy || 'Sem política configurada' }}
            </span>
          </div>
        </template>
        <template #edit>
          <div class="field">
            <label>Texto exibido pro cliente</label>
            <Textarea
              v-model="form.settings.cancellationPolicy"
              rows="4"
              class="w-full"
            />
            <small class="rule-hint">
              Aparece na landing pública e no e-mail de confirmação. Cancelamento self-service será liberado na fase 2.
            </small>
          </div>
        </template>
      </EditableSection>

      <div v-if="editing" class="actions-row">
        <Button
          label="Restaurar padrões"
          severity="secondary"
          outlined
          type="button"
          @click="resetDefaults"
        />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import ToggleSwitch from 'primevue/toggleswitch';

definePageMeta({ layout: 'default' });

const { tenant, loading, fetchTenant, updateSettings } = useTenant();
const toast = useToast?.();
const saving = ref(false);
const editing = ref(false);

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

const form = reactive<{ settings: any }>({
  settings: { ...defaults },
});

async function load() {
  await fetchTenant();
  if (tenant.value?.settings) {
    form.settings = { ...defaults, ...tenant.value.settings };
  }
}

onMounted(load);

function startEditing() {
  editing.value = true;
}

async function cancelEditing() {
  editing.value = false;
  await load();
}

function resetDefaults() {
  form.settings = { ...defaults };
  toast?.add?.({
    severity: 'info',
    summary: 'Padrões restaurados',
    detail: 'Não esqueça de salvar.',
    life: 2500,
  });
}

async function save() {
  saving.value = true;
  try {
    await updateSettings(form.settings);
    editing.value = false;
    toast?.add?.({
      severity: 'success',
      summary: 'Salvo!',
      detail: 'Regras atualizadas.',
      life: 2500,
    });
  } catch {
    toast?.add?.({
      severity: 'error',
      summary: 'Erro',
      detail: 'Não foi possível salvar.',
      life: 4000,
    });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.config-page {
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
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
  gap: 0.5rem;
  align-items: center;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 1rem;
}

.field:last-child {
  margin-bottom: 0;
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

.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.5rem 0;
  margin-bottom: 1rem;
}

.toggle-row:last-child {
  margin-bottom: 0;
}

.toggle-info {
  flex: 1;
}

.toggle-info label {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.rule-hint {
  font-size: 0.8rem;
  color: var(--p-text-color-secondary);
  margin: 0.25rem 0 0;
  line-height: 1.45;
}

.actions-row {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.w-full {
  width: 100%;
}

@media (max-width: 768px) {
  .field-row {
    grid-template-columns: 1fr;
  }
}
</style>
