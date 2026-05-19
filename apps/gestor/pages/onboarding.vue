<template>
  <div class="onboarding-container">
    <header class="onboarding-title">
      <h1>Vamos configurar seu estabelecimento</h1>
      <p>{{ stepDescriptions[currentStep] }}</p>
    </header>

    <!-- Progress -->
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: `${((currentStep + 1) / 5) * 100}%` }"></div>
    </div>
    <div class="step-indicators">
      <span v-for="(s, i) in stepLabels" :key="i" :class="['step-dot', { active: i <= currentStep }]">
        {{ i + 1 }}. {{ s }}
      </span>
    </div>

    <!-- PASSO 1: Estabelecimento -->
    <Card v-if="currentStep === 0" class="step-card">
      <template #content>
        <h2 class="step-heading"><i class="pi pi-building"></i> Dados do Estabelecimento</h2>
        <div class="field-row">
          <div class="field">
            <label for="name">Nome do Estabelecimento *</label>
            <InputText id="name" v-model="form.name" placeholder="Ex: Society do Zé" class="w-full" />
          </div>
          <div class="field">
            <label for="slug">Link público (slug) *</label>
            <InputGroup>
              <InputGroupAddon>agenda-slim.com.br/r/</InputGroupAddon>
              <InputText id="slug" v-model="form.slug" placeholder="society-do-ze" />
            </InputGroup>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="type">Tipo</label>
            <Select id="type" v-model="form.type" :options="typeOptions" optionLabel="label" optionValue="value" placeholder="Selecione" class="w-full" />
          </div>
          <div class="field">
            <label for="whatsapp">WhatsApp</label>
            <InputMask id="whatsapp" v-model="form.whatsapp" mask="(99) 99999-9999" placeholder="(11) 90000-0000" class="w-full" />
          </div>
        </div>
        <div class="field-row address-group">
          <div class="field cep-field">
            <label for="cep">CEP</label>
            <div class="p-inputgroup">
              <InputMask id="cep" v-model="form.cep" mask="99999-999" placeholder="00000-000" class="w-full" @blur="fetchAddress" />
              <Button icon="pi pi-search" :loading="loadingAddress" @click="fetchAddress" severity="secondary" />
            </div>
          </div>
          <div class="field address-field">
            <label for="address">Endereço completo (Rua, Bairro, Cidade)</label>
            <InputText id="address" v-model="form.address" placeholder="Preenchimento automático" class="w-full" />
          </div>
          <div class="field number-field">
            <label for="addressNumber">Número</label>
            <InputText id="addressNumber" v-model="form.addressNumber" placeholder="Nº" class="w-full" />
          </div>
        </div>
      </template>
    </Card>

    <!-- PASSO 2: Quadras -->
    <Card v-else-if="currentStep === 1" class="step-card">
      <template #content>
        <h2 class="step-heading"><i class="pi pi-objects-column"></i> Suas Quadras</h2>
        <p class="step-desc">Cadastre pelo menos 1 quadra. Você pode adicionar mais depois.</p>
        <div v-for="(q, i) in form.resources" :key="i" class="resource-row">
          <InputText v-model="q.name" :placeholder="`Quadra ${i + 1}`" class="resource-name" />
          <Select v-model="q.type" :options="typeOptions" optionLabel="label" optionValue="value" placeholder="Tipo" class="resource-type" />
          <Button icon="pi pi-trash" severity="danger" text @click="form.resources.splice(i, 1)" :disabled="form.resources.length <= 1" />
        </div>
        <Button icon="pi pi-plus" label="Adicionar quadra" severity="secondary" text @click="addResource" class="mt-1" />
      </template>
    </Card>

    <!-- PASSO 3: Serviços -->
    <Card v-else-if="currentStep === 2" class="step-card">
      <template #content>
        <h2 class="step-heading"><i class="pi pi-tag"></i> Tipos de Serviço</h2>
        <p class="step-desc">Defina os serviços que seus clientes podem reservar.</p>
        <div v-for="(s, i) in form.services" :key="i" class="service-row">
          <InputText v-model="s.name" placeholder="Ex: 1h Society" class="service-name" />
          <InputNumber v-model="s.durationMinutes" suffix=" min" :min="15" :step="15" class="service-duration" />
          <InputNumber v-model="s.priceCents" prefix="R$ " :minFractionDigits="2" mode="decimal" class="service-price" />
          <Button icon="pi pi-trash" severity="danger" text @click="form.services.splice(i, 1)" :disabled="form.services.length <= 1" />
        </div>
        <Button icon="pi pi-plus" label="Adicionar serviço" severity="secondary" text @click="addService" class="mt-1" />
      </template>
    </Card>

    <!-- PASSO 4: Horários -->
    <Card v-else-if="currentStep === 3" class="step-card">
      <template #content>
        <h2 class="step-heading"><i class="pi pi-clock"></i> Horários de Funcionamento</h2>
        <p class="step-desc">Defina quando suas quadras estão disponíveis.</p>
        <div v-for="(h, i) in form.scheduleRules" :key="i" class="schedule-row">
          <div class="schedule-days">
            <SelectButton v-model="h.weekdays" :options="weekdayOptions" optionLabel="label" optionValue="value" multiple class="weekday-selector" />
          </div>
          <div class="schedule-times">
            <div class="field-inline">
              <label>Abre</label>
              <InputMask v-model="h.startTime" mask="99:99" placeholder="08:00" class="time-input" />
            </div>
            <div class="field-inline">
              <label>Fecha</label>
              <InputMask v-model="h.endTime" mask="99:99" placeholder="23:00" class="time-input" />
            </div>
            <div class="field-inline">
              <label>Preço</label>
              <InputNumber v-model="h.priceModifier" suffix="x" :min="0.5" :max="3" :step="0.1" :minFractionDigits="1" class="modifier-input" />
            </div>
            <Button icon="pi pi-trash" severity="danger" text @click="form.scheduleRules.splice(i, 1)" :disabled="form.scheduleRules.length <= 1" />
          </div>
        </div>
        <Button icon="pi pi-plus" label="Adicionar faixa de horário" severity="secondary" text @click="addScheduleRule" class="mt-1" />
      </template>
    </Card>

    <!-- PASSO 5: Regras -->
    <Card v-else class="step-card">
      <template #content>
        <h2 class="step-heading"><i class="pi pi-cog"></i> Regras de Reserva</h2>
        <p class="step-desc">Configure o comportamento do seu sistema de agendamento.</p>
        <div class="rules-grid">
          <div class="field">
            <label>Antecedência mínima (minutos)</label>
            <InputNumber v-model="form.settings.minAdvanceMinutes" :min="0" :step="15" suffix=" min" class="w-full" />
          </div>
          <div class="field">
            <label>Antecedência máxima (dias)</label>
            <InputNumber v-model="form.settings.maxAdvanceDays" :min="1" :max="365" suffix=" dias" class="w-full" />
          </div>
          <div class="field">
            <label>Tempo de hold no carrinho</label>
            <InputNumber v-model="form.settings.holdMinutes" :min="3" :max="30" suffix=" min" class="w-full" />
          </div>
          <div class="rule-toggle">
            <div>
              <label>Aceitar "pagar na chegada"</label>
              <p class="rule-hint">Permite que o cliente reserve sem pagar via PIX.</p>
            </div>
            <ToggleSwitch v-model="form.settings.acceptPayOnSite" />
          </div>
          <div class="field" v-if="form.settings.acceptPayOnSite">
            <label>Timeout pagar na chegada</label>
            <InputNumber v-model="form.settings.payOnSiteTimeoutMinutes" :min="15" suffix=" min" class="w-full" />
          </div>
          <div class="rule-toggle">
            <div>
              <label>Exigir cadastro do cliente</label>
              <p class="rule-hint">O cliente precisará criar uma conta para reservar.</p>
            </div>
            <ToggleSwitch v-model="form.settings.requireRegistration" />
          </div>
          <div class="field full-width">
            <label>Política de cancelamento</label>
            <Textarea v-model="form.settings.cancellationPolicy" rows="3" class="w-full" />
          </div>
        </div>
      </template>
    </Card>

    <!-- Navegação -->
    <div class="step-nav">
      <Button label="Voltar" icon="pi pi-arrow-left" severity="secondary" outlined :disabled="currentStep === 0" @click="currentStep--" />
      <Button
        :label="currentStep === 4 ? 'Finalizar e ir ao Painel' : 'Próximo'"
        :icon="currentStep === 4 ? 'pi pi-check' : 'pi pi-arrow-right'"
        :iconPos="currentStep === 4 ? 'left' : 'right'"
        :loading="saving"
        @click="next"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import InputMask from 'primevue/inputmask';
import InputGroup from 'primevue/inputgroup';
import InputGroupAddon from 'primevue/inputgroupaddon';
import Select from 'primevue/select';
import SelectButton from 'primevue/selectbutton';
import ToggleSwitch from 'primevue/toggleswitch';
import Textarea from 'primevue/textarea';

definePageMeta({ layout: 'onboarding' });

const config = useRuntimeConfig();
const saving = ref(false);
const currentStep = ref(0);

const stepLabels = ['Estabelecimento', 'Quadras', 'Serviços', 'Horários', 'Regras'];
const stepDescriptions = [
  'Conte-nos sobre o seu negócio.',
  'Cadastre suas quadras ou espaços.',
  'Defina os serviços e preços.',
  'Configure os horários de funcionamento.',
  'Ajuste as regras de reserva do seu estabelecimento.',
];

const typeOptions = [
  { label: 'Society', value: 'society' },
  { label: 'Futsal', value: 'futsal' },
  { label: 'Padel', value: 'padel' },
  { label: 'Beach Tennis', value: 'beach_tennis' },
  { label: 'Tênis', value: 'tennis' },
  { label: 'Outro', value: 'outro' },
];

const weekdayOptions = [
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
  { label: 'Dom', value: 0 },
];

const form = reactive({
  name: '',
  slug: '',
  type: 'society',
  cep: '',
  address: '',
  addressNumber: '',
  whatsapp: '',
  resources: [{ name: '', type: 'society' }],
  services: [{ name: '1h Society', durationMinutes: 60, priceCents: 150 }],
  scheduleRules: [
    { weekdays: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '23:00', priceModifier: 1.0 },
    { weekdays: [6, 0], startTime: '08:00', endTime: '22:00', priceModifier: 1.3 },
  ],
  settings: {
    minAdvanceMinutes: 60,
    maxAdvanceDays: 30,
    holdMinutes: 10,
    acceptPayOnSite: false,
    payOnSiteTimeoutMinutes: 60,
    requireRegistration: false,
    cancellationPolicy: 'Cancelamentos com mais de 24h de antecedência são reembolsados integralmente.',
  },
});

function addResource() {
  form.resources.push({ name: '', type: 'society' });
}
function addService() {
  form.services.push({ name: '', durationMinutes: 60, priceCents: 100 });
}
function addScheduleRule() {
  form.scheduleRules.push({ weekdays: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '22:00', priceModifier: 1.0 });
}

const loadingAddress = ref(false);

async function fetchAddress() {
  const cepLimpo = form.cep.replace(/\D/g, '');
  if (cepLimpo.length === 8) {
    loadingAddress.value = true;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      if (!data.erro) {
        form.address = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
        setTimeout(() => document.getElementById('addressNumber')?.focus(), 100);
      }
    } catch (e) {
      console.error('Erro ao buscar CEP', e);
    } finally {
      loadingAddress.value = false;
    }
  }
}

function validateStep(): boolean {
  if (currentStep.value === 0) {
    return !!(form.name.trim() && form.slug.trim());
  }
  if (currentStep.value === 1) {
    return form.resources.some(r => r.name.trim());
  }
  if (currentStep.value === 2) {
    return form.services.some(s => s.name.trim() && s.priceCents > 0);
  }
  if (currentStep.value === 3) {
    return form.scheduleRules.some(r => r.weekdays.length > 0 && r.startTime && r.endTime);
  }
  return true;
}

async function next() {
  if (!validateStep()) return;

  if (currentStep.value < 4) {
    currentStep.value++;
  } else {
    saving.value = true;
    
    try {
      if (config.public.mockAuth) {
        // Se for mock, apenas simula delay e prossegue
        await new Promise(r => setTimeout(r, 800));
        await navigateTo('/dashboard');
        return;
      }

      // 1. Cria o Tenant
      const tenantData = await $fetch('/api/tenant', {
        method: 'POST',
        body: {
          name: form.name,
          slug: form.slug,
          type: form.type,
          address: form.address ? `${form.address}, ${form.addressNumber}` : null,
          whatsapp: form.whatsapp
        }
      });

      const tenantId = tenantData.id;

      // 2. Cria as Quadras (Resources)
      await $fetch('/api/resources', {
        method: 'POST',
        body: {
          tenantId,
          resources: form.resources
        }
      });

      // 3. Cria os Serviços
      await $fetch('/api/services', {
        method: 'POST',
        body: {
          tenantId,
          services: form.services
        }
      });

      // 4. Cria as Regras de Horário
      await $fetch('/api/schedule-rules', {
        method: 'POST',
        body: {
          tenantId,
          rules: form.scheduleRules
        }
      });

      // 5. Atualiza as Configurações (Settings)
      await $fetch('/api/tenant/settings', {
        method: 'PATCH',
        body: form.settings
      });

      // Finaliza navegando pro dashboard
      await navigateTo('/dashboard');

    } catch (err) {
      console.error('Erro ao salvar onboarding:', err);
      // Aqui você pode colocar um Toast de erro futuramente
    } finally {
      saving.value = false;
    }
  }
}
</script>

<style scoped>
.onboarding-container {
  width: 100%;
  max-width: 920px;
}

.onboarding-title {
  text-align: center;
  margin-bottom: 1.5rem;
}
.onboarding-title h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--p-text-color);
}
.onboarding-title p {
  margin: 0.35rem 0 0;
  color: var(--p-text-color-secondary);
  font-size: 0.9rem;
}

/* Progress bar */
.progress-bar {
  height: 4px;
  background: var(--p-surface-200);
  border-radius: 2px;
  margin-bottom: 0.75rem;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--p-primary-500);
  border-radius: 2px;
  transition: width 0.4s ease;
}

.step-indicators {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 1.5rem;
}
.step-dot {
  font-size: 0.75rem;
  color: var(--p-surface-400);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;
}
.step-dot.active {
  color: var(--p-primary-700);
  background: var(--p-primary-50);
  font-weight: 600;
}

/* Card de step */
.step-card {
  width: 100%;
}
:deep(.p-card-body) {
  padding: 1.5rem;
}

.step-heading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0 0 1rem;
  color: var(--p-text-color);
}
.step-heading i {
  color: var(--p-primary-500);
}
.step-desc {
  font-size: 0.85rem;
  color: var(--p-text-color-secondary);
  margin: -0.5rem 0 1rem;
}

/* Campos */
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
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
.w-full { width: 100%; }
.mt-1 { margin-top: 0.5rem; }

/* Quadras */
.resource-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  align-items: center;
}
.resource-name { flex: 2; }
.resource-type { flex: 1; }

/* Serviços */
.service-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  align-items: center;
}
.service-name { flex: 2; }
.service-duration { flex: 1; }
.service-price { flex: 1; }

/* Horários */
.schedule-row {
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
}
.schedule-days {
  margin-bottom: 0.75rem;
}
:deep(.weekday-selector .p-togglebutton) {
  padding: 0.4rem 0.65rem;
  font-size: 0.8rem;
}
.schedule-times {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
  flex-wrap: wrap;
}
.field-inline {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.field-inline label {
  font-size: 0.75rem;
  color: var(--p-text-color-secondary);
}
.time-input { width: 90px; }
.modifier-input { width: 90px; }

/* Regras */
.rules-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
.rules-grid .full-width {
  grid-column: 1 / -1;
}
.rule-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  grid-column: 1 / -1;
  border-top: 1px solid var(--p-surface-100);
}
.rule-toggle label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--p-text-color);
}
.rule-hint {
  font-size: 0.75rem;
  color: var(--p-text-color-secondary);
  margin: 0.15rem 0 0;
}

/* Navegação */
.step-nav {
  display: flex;
  justify-content: space-between;
  margin-top: 1.5rem;
  width: 100%;
}

/* Responsivo */
@media (max-width: 600px) {
  .field-row { grid-template-columns: 1fr; }
  .resource-row { flex-wrap: wrap; }
  .service-row { flex-wrap: wrap; }
  .schedule-times { flex-direction: column; align-items: stretch; }
  .time-input, .modifier-input { width: 100%; }
  .rules-grid { grid-template-columns: 1fr; }
  .rule-toggle { flex-direction: column; align-items: flex-start; }
}
/* Endereço */
.address-group {
  grid-template-columns: 200px 1fr 120px;
}
@media (max-width: 600px) {
  .address-group {
    grid-template-columns: 1fr;
  }
}
</style>
