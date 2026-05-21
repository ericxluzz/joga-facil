<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Recebimentos</h1>
        <p class="page-sub">Configure sua conta financeira para receber pagamentos via PIX</p>
      </div>
    </div>

    <!-- Status card (when approved or submitted) -->
    <div v-if="account && account.status === 'approved'" class="status-card status-card--approved">
      <div class="status-card__icon">
        <i class="pi pi-check-circle" />
      </div>
      <div>
        <div class="status-card__title">Conta aprovada</div>
        <div class="status-card__sub">Sua conta está ativa. Você já pode receber pagamentos via PIX.</div>
        <div v-if="account.validapayAccountNumber" class="status-card__detail">
          Número da conta: <strong>{{ account.validapayAccountNumber }}</strong>
        </div>
      </div>
    </div>

    <div v-else-if="account && account.status === 'pending_review'" class="status-card status-card--pending">
      <div class="status-card__icon"><i class="pi pi-clock" /></div>
      <div>
        <div class="status-card__title">Em análise</div>
        <div class="status-card__sub">Sua proposta foi enviada. A análise pode levar até 2 dias úteis.</div>
      </div>
    </div>

    <div v-else-if="account && account.status === 'submitted'" class="status-card status-card--pending">
      <div class="status-card__icon"><i class="pi pi-send" /></div>
      <div>
        <div class="status-card__title">Proposta enviada</div>
        <div class="status-card__sub">Aguardando processamento pelo ValidaPay.</div>
      </div>
    </div>

    <div v-else-if="account && account.status === 'rejected'" class="status-card status-card--rejected">
      <div class="status-card__icon"><i class="pi pi-times-circle" /></div>
      <div>
        <div class="status-card__title">Cadastro rejeitado</div>
        <div class="status-card__sub">
          {{ account.rejectionReason || 'Entre em contato para mais informações.' }}
        </div>
        <button class="btn-sm btn-primary mt-2" @click="startOver">Corrigir cadastro</button>
      </div>
    </div>

    <!-- Wizard (when not approved/submitted) -->
    <div v-if="canEdit" class="wizard">
      <!-- Step indicators -->
      <div class="wizard-steps">
        <div
          v-for="(s, i) in steps"
          :key="i"
          class="wizard-step"
          :class="{ 'is-active': step === i, 'is-done': step > i }"
        >
          <div class="step-bubble">
            <i v-if="step > i" class="pi pi-check" />
            <span v-else>{{ i + 1 }}</span>
          </div>
          <span class="step-label">{{ s }}</span>
        </div>
      </div>

      <!-- Step 0: Tipo de pessoa -->
      <div v-if="step === 0" class="wizard-card">
        <h2 class="wiz-title">Tipo de pessoa</h2>
        <p class="wiz-sub">Selecione o tipo de cadastro financeiro</p>
        <div class="type-options">
          <button
            class="type-option"
            :class="{ 'is-selected': form.personType === 'PF' }"
            @click="form.personType = 'PF'"
          >
            <i class="pi pi-user" />
            <span class="type-label">Pessoa Física</span>
            <span class="type-desc">CPF — individual</span>
          </button>
          <button
            class="type-option"
            :class="{ 'is-selected': form.personType === 'PJ' }"
            @click="form.personType = 'PJ'"
          >
            <i class="pi pi-building" />
            <span class="type-label">Pessoa Jurídica</span>
            <span class="type-desc">CNPJ — empresa</span>
          </button>
        </div>
        <div class="wiz-actions">
          <button class="btn-primary" @click="nextStep">Continuar</button>
        </div>
      </div>

      <!-- Step 1: Dados cadastrais -->
      <div v-else-if="step === 1" class="wizard-card">
        <h2 class="wiz-title">Dados cadastrais</h2>
        <div class="form-grid">
          <div class="field" :class="{ 'field--full': form.personType === 'PJ' }">
            <label>{{ form.personType === 'PF' ? 'Nome completo' : 'Razão social' }} *</label>
            <input v-model="form.legalName" placeholder="Nome completo" />
          </div>
          <div v-if="form.personType === 'PJ'" class="field">
            <label>Nome fantasia</label>
            <input v-model="form.tradeName" placeholder="Nome fantasia" />
          </div>
          <div class="field">
            <label>{{ form.personType === 'PF' ? 'CPF' : 'CNPJ' }} *</label>
            <input v-model="form.document" :placeholder="form.personType === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'" />
          </div>
          <div v-if="form.personType === 'PF'" class="field">
            <label>Data de nascimento *</label>
            <input v-model="form.birthDate" type="date" />
          </div>
          <div class="field">
            <label>E-mail *</label>
            <input v-model="form.email" type="email" placeholder="email@exemplo.com" />
          </div>
          <div class="field">
            <label>Telefone *</label>
            <input v-model="form.phone" placeholder="(11) 99999-9999" />
          </div>
        </div>

        <!-- PJ: representative -->
        <template v-if="form.personType === 'PJ'">
          <h3 class="section-title">Representante legal</h3>
          <div class="form-grid">
            <div class="field field--full">
              <label>Nome completo *</label>
              <input v-model="form.representative.name" placeholder="Nome do representante" />
            </div>
            <div class="field">
              <label>CPF *</label>
              <input v-model="form.representative.document" placeholder="000.000.000-00" />
            </div>
            <div class="field">
              <label>Data de nascimento *</label>
              <input v-model="form.representative.birthDate" type="date" />
            </div>
            <div class="field">
              <label>E-mail</label>
              <input v-model="form.representative.email" type="email" />
            </div>
            <div class="field">
              <label>Telefone</label>
              <input v-model="form.representative.phone" placeholder="(11) 99999-9999" />
            </div>
          </div>
        </template>

        <!-- Address -->
        <h3 class="section-title">Endereço</h3>
        <div class="form-grid">
          <div class="field">
            <label>CEP *</label>
            <input v-model="form.address.zipcode" placeholder="00000-000" @blur="lookupCep" />
          </div>
          <div class="field field--2x">
            <label>Rua *</label>
            <input v-model="form.address.street" placeholder="Rua / Av." />
          </div>
          <div class="field">
            <label>Número *</label>
            <input v-model="form.address.number" placeholder="123" />
          </div>
          <div class="field">
            <label>Complemento</label>
            <input v-model="form.address.complement" placeholder="Apto 2" />
          </div>
          <div class="field">
            <label>Bairro</label>
            <input v-model="form.address.neighborhood" placeholder="Centro" />
          </div>
          <div class="field">
            <label>Cidade *</label>
            <input v-model="form.address.city" placeholder="São Paulo" />
          </div>
          <div class="field">
            <label>Estado *</label>
            <input v-model="form.address.state" placeholder="SP" maxlength="2" />
          </div>
        </div>

        <div class="wiz-actions">
          <button class="btn-secondary" @click="prevStep">Voltar</button>
          <button class="btn-primary" :disabled="saving" @click="saveDraft">
            <span v-if="saving"><i class="pi pi-spin pi-spinner" /> Salvando...</span>
            <span v-else>Continuar</span>
          </button>
        </div>
      </div>

      <!-- Step 2: Documentos -->
      <div v-else-if="step === 2" class="wizard-card">
        <h2 class="wiz-title">Documentos</h2>
        <p class="wiz-sub">Envie os documentos necessários para validar sua identidade</p>

        <div class="doc-list">
          <div
            v-for="docType in requiredDocTypes"
            :key="docType.type"
            class="doc-item"
          >
            <div class="doc-info">
              <span class="doc-label">{{ docType.label }}</span>
              <span class="doc-note">{{ docType.note }}</span>
            </div>
            <div class="doc-action">
              <span v-if="getUploadedDoc(docType.type)" class="doc-uploaded">
                <i class="pi pi-check" /> Enviado
                <button class="doc-remove" @click="removeDoc(getUploadedDoc(docType.type)!.id)">
                  <i class="pi pi-trash" />
                </button>
              </span>
              <label v-else class="doc-upload-btn">
                <i class="pi pi-upload" /> Enviar
                <input
                  type="file"
                  :accept="docType.accept || 'image/*,.pdf'"
                  style="display:none"
                  @change="(e) => uploadDoc(e, docType.type)"
                />
              </label>
            </div>
          </div>
        </div>

        <div class="wiz-actions">
          <button class="btn-secondary" @click="prevStep">Voltar</button>
          <button class="btn-primary" @click="nextStep">Continuar</button>
        </div>
      </div>

      <!-- Step 3: Revisão -->
      <div v-else-if="step === 3" class="wizard-card">
        <h2 class="wiz-title">Revisão</h2>
        <div class="review-grid">
          <div class="review-row">
            <span class="review-label">Tipo</span>
            <span>{{ form.personType === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica' }}</span>
          </div>
          <div class="review-row">
            <span class="review-label">{{ form.personType === 'PF' ? 'Nome' : 'Razão social' }}</span>
            <span>{{ form.legalName }}</span>
          </div>
          <div class="review-row">
            <span class="review-label">{{ form.personType === 'PF' ? 'CPF' : 'CNPJ' }}</span>
            <span>{{ form.document }}</span>
          </div>
          <div class="review-row">
            <span class="review-label">E-mail</span>
            <span>{{ form.email }}</span>
          </div>
          <div class="review-row">
            <span class="review-label">Telefone</span>
            <span>{{ form.phone }}</span>
          </div>
          <div class="review-row">
            <span class="review-label">Endereço</span>
            <span>{{ form.address.street }}, {{ form.address.number }} – {{ form.address.city }}/{{ form.address.state }}</span>
          </div>
          <div class="review-row">
            <span class="review-label">Documentos</span>
            <span>{{ uploadedDocs.length }} enviado(s)</span>
          </div>
        </div>

        <div class="wiz-actions">
          <button class="btn-secondary" @click="prevStep">Voltar</button>
          <button class="btn-primary" :disabled="submitting" @click="submitAccount">
            <span v-if="submitting"><i class="pi pi-spin pi-spinner" /> Enviando...</span>
            <span v-else>Enviar para análise</span>
          </button>
        </div>
      </div>

      <!-- Step 4: Status after submit -->
      <div v-else-if="step === 4" class="wizard-card wizard-card--center">
        <i class="pi pi-send step-done-icon" />
        <h2 class="wiz-title">Proposta enviada!</h2>
        <p class="wiz-sub">Sua conta será analisada em até 2 dias úteis.<br>Você receberá uma notificação quando for aprovada.</p>
      </div>
    </div>

    <div v-if="errorMsg" class="error-toast">{{ errorMsg }}</div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' });

const steps = ['Tipo', 'Dados', 'Documentos', 'Revisão', 'Pronto'];

const step = ref(0);
const saving = ref(false);
const submitting = ref(false);
const errorMsg = ref('');
const accountId = ref<string | null>(null);
const uploadedDocs = ref<{ id: string; documentType: string; fileUrl: string; status: string }[]>([]);

const form = reactive({
  personType: 'PF' as 'PF' | 'PJ',
  legalName: '',
  tradeName: '',
  document: '',
  birthDate: '',
  email: '',
  phone: '',
  address: {
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipcode: '',
  },
  representative: {
    name: '',
    document: '',
    birthDate: '',
    email: '',
    phone: '',
  },
});

type AccountData = {
  id?: string;
  status: string;
  personType: string | null;
  document?: string;
  legalName?: string;
  tradeName?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipcode?: string;
  };
  representative?: {
    name?: string;
    document?: string;
    birthDate?: string;
    email?: string;
    phone?: string;
  } | null;
  validapayAccountNumber?: string;
  rejectionReason?: string;
  documents?: { id: string; documentType: string; fileUrl: string; status: string }[];
};

const { data: account, refresh: refreshAccount } = await useFetch<AccountData>('/api/payments/account');

const canEdit = computed(() => {
  const s = account.value?.status;
  return !s || ['not_started', 'draft', 'rejected'].includes(s);
});

// Populate form from existing account
watch(account, (a) => {
  if (!a || a.status === 'not_started') return;
  form.personType = (a.personType as 'PF' | 'PJ') || 'PF';
  form.legalName = a.legalName || '';
  form.tradeName = a.tradeName || '';
  form.document = a.document || '';
  form.birthDate = a.birthDate || '';
  form.email = a.email || '';
  form.phone = a.phone || '';
  if (a.address) {
    form.address.street = a.address.street || '';
    form.address.number = a.address.number || '';
    form.address.complement = a.address.complement || '';
    form.address.neighborhood = a.address.neighborhood || '';
    form.address.city = a.address.city || '';
    form.address.state = a.address.state || '';
    form.address.zipcode = a.address.zipcode || '';
  }
  if (a.representative) {
    form.representative.name = a.representative.name || '';
    form.representative.document = a.representative.document || '';
    form.representative.birthDate = a.representative.birthDate || '';
    form.representative.email = a.representative.email || '';
    form.representative.phone = a.representative.phone || '';
  }
  uploadedDocs.value = a.documents || [];
  accountId.value = a.id || null;
}, { immediate: true });

const requiredDocTypes = computed(() => {
  const base = [
    { type: 'selfie', label: 'Selfie com documento', note: 'Foto segurando o documento', accept: 'image/*' },
    { type: 'proof_of_address', label: 'Comprovante de endereço', note: 'Últimos 3 meses', accept: 'image/*,.pdf' },
  ];
  if (form.personType === 'PF') {
    return [
      { type: 'rg_front', label: 'RG ou CNH (frente)', note: 'Frente do documento', accept: 'image/*' },
      { type: 'rg_back', label: 'RG (verso)', note: 'Verso do RG (se aplicável)', accept: 'image/*' },
      ...base,
    ];
  }
  return [
    { type: 'contrato_social', label: 'Contrato social', note: 'Documento de constituição', accept: 'image/*,.pdf' },
    { type: 'cartao_cnpj', label: 'Cartão CNPJ', note: 'Comprovante do CNPJ', accept: 'image/*,.pdf' },
    { type: 'representative_doc', label: 'Documento do representante', note: 'RG ou CNH', accept: 'image/*' },
    ...base,
  ];
});

function getUploadedDoc(type: string) {
  return uploadedDocs.value.find((d) => d.documentType === type);
}

function nextStep() { step.value = Math.min(step.value + 1, steps.length - 1); }
function prevStep() { step.value = Math.max(step.value - 1, 0); }

async function saveDraft() {
  saving.value = true;
  errorMsg.value = '';
  try {
    const res = await $fetch<{ ok: boolean; id: string }>('/api/payments/account', {
      method: 'POST',
      body: { ...form },
    });
    accountId.value = res.id;
    await refreshAccount();
    nextStep();
  } catch (e: any) {
    errorMsg.value = e?.data?.message || 'Erro ao salvar';
  } finally {
    saving.value = false;
  }
}

async function uploadDoc(event: Event, docType: string) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  errorMsg.value = '';
  const fd = new FormData();
  fd.append('documentType', docType);
  fd.append('file', file);
  try {
    const res = await $fetch<{ ok: boolean; document: any }>('/api/payments/account/documents', {
      method: 'POST',
      body: fd,
    });
    uploadedDocs.value.push(res.document);
  } catch (e: any) {
    errorMsg.value = e?.data?.message || 'Erro no upload';
  }
}

async function removeDoc(id: string) {
  try {
    await $fetch(`/api/payments/account/documents/${id}`, { method: 'DELETE' });
    uploadedDocs.value = uploadedDocs.value.filter((d) => d.id !== id);
  } catch (e: any) {
    errorMsg.value = e?.data?.message || 'Erro ao remover';
  }
}

async function submitAccount() {
  submitting.value = true;
  errorMsg.value = '';
  try {
    await $fetch('/api/payments/account/submit', { method: 'POST' });
    await refreshAccount();
    step.value = 4;
  } catch (e: any) {
    errorMsg.value = e?.data?.message || 'Erro ao enviar';
  } finally {
    submitting.value = false;
  }
}

function startOver() {
  step.value = 0;
}

async function lookupCep() {
  const zip = form.address.zipcode.replace(/\D/g, '');
  if (zip.length !== 8) return;
  try {
    const res = await $fetch<any>(`https://viacep.com.br/ws/${zip}/json/`);
    if (res && !res.erro) {
      form.address.street = res.logradouro || form.address.street;
      form.address.neighborhood = res.bairro || form.address.neighborhood;
      form.address.city = res.localidade || form.address.city;
      form.address.state = res.uf || form.address.state;
    }
  } catch {}
}
</script>

<style scoped>
.page { padding: 2rem; max-width: 800px; }
.page-header { margin-bottom: 2rem; }
.page-title { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0 0 0.25rem; }
.page-sub { font-size: 0.875rem; color: #64748b; margin: 0; }

/* Status cards */
.status-card {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 1.25rem 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  border: 1px solid;
}
.status-card--approved { background: #f0fdf4; border-color: #86efac; color: #166534; }
.status-card--pending { background: #fffbeb; border-color: #fde68a; color: #92400e; }
.status-card--rejected { background: #fef2f2; border-color: #fca5a5; color: #991b1b; }
.status-card__icon { font-size: 1.5rem; margin-top: 0.1rem; }
.status-card__title { font-weight: 700; font-size: 1rem; }
.status-card__sub { font-size: 0.875rem; margin-top: 0.25rem; }
.status-card__detail { font-size: 0.8125rem; margin-top: 0.375rem; }

/* Wizard steps */
.wizard-steps {
  display: flex;
  gap: 0;
  margin-bottom: 2rem;
  overflow-x: auto;
}
.wizard-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  flex: 1;
  position: relative;
}
.wizard-step:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 16px;
  left: calc(50% + 16px);
  right: calc(-50% + 16px);
  height: 2px;
  background: #e2e8f0;
  z-index: 0;
}
.wizard-step.is-done::after { background: #22c55e; }
.step-bubble {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e2e8f0;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
  position: relative;
  z-index: 1;
  transition: background 0.2s, color 0.2s;
}
.wizard-step.is-active .step-bubble { background: #0f172a; color: #fff; }
.wizard-step.is-done .step-bubble { background: #22c55e; color: #fff; }
.step-label { font-size: 0.6875rem; color: #64748b; font-weight: 500; white-space: nowrap; }
.wizard-step.is-active .step-label { color: #0f172a; font-weight: 700; }

/* Wizard card */
.wizard-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 2rem;
}
.wizard-card--center { text-align: center; padding: 3rem 2rem; }
.wiz-title { font-size: 1.125rem; font-weight: 700; color: #0f172a; margin: 0 0 0.5rem; }
.wiz-sub { font-size: 0.875rem; color: #64748b; margin: 0 0 1.5rem; }
.section-title { font-size: 0.875rem; font-weight: 700; color: #0f172a; margin: 1.5rem 0 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }

/* Type options */
.type-options { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
.type-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  font-family: inherit;
}
.type-option:hover { border-color: #94a3b8; }
.type-option.is-selected { border-color: #0f172a; background: #f8fafc; }
.type-option i { font-size: 1.5rem; color: #64748b; }
.type-option.is-selected i { color: #0f172a; }
.type-label { font-weight: 700; font-size: 0.9375rem; color: #0f172a; }
.type-desc { font-size: 0.75rem; color: #94a3b8; }

/* Form */
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
.field { display: flex; flex-direction: column; gap: 0.375rem; }
.field--full { grid-column: 1 / -1; }
.field--2x { grid-column: span 2; }
.field label { font-size: 0.8125rem; font-weight: 600; color: #374151; }
.field input, .field select {
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: inherit;
  color: #0f172a;
  transition: border-color 0.15s;
}
.field input:focus, .field select:focus {
  outline: none;
  border-color: #0f172a;
}

/* Documents */
.doc-list { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; }
.doc-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
}
.doc-info { display: flex; flex-direction: column; gap: 0.125rem; }
.doc-label { font-size: 0.875rem; font-weight: 600; color: #0f172a; }
.doc-note { font-size: 0.75rem; color: #94a3b8; }
.doc-uploaded { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; font-weight: 600; color: #16a34a; }
.doc-remove { background: none; border: none; cursor: pointer; color: #ef4444; padding: 0.25rem; border-radius: 4px; }
.doc-upload-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  background: #0f172a;
  color: #fff;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.doc-upload-btn:hover { background: #1e293b; }

/* Review */
.review-grid { display: flex; flex-direction: column; gap: 0; margin-bottom: 1.5rem; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
.review-row { display: flex; gap: 1rem; padding: 0.75rem 1rem; font-size: 0.875rem; border-bottom: 1px solid #f1f5f9; }
.review-row:last-child { border-bottom: none; }
.review-label { width: 140px; flex-shrink: 0; font-weight: 600; color: #64748b; }

/* Actions */
.wiz-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
.btn-primary, .btn-secondary {
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}
.btn-primary { background: #0f172a; color: #fff; }
.btn-primary:hover { background: #1e293b; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: #f1f5f9; color: #374151; }
.btn-secondary:hover { background: #e2e8f0; }
.btn-sm { padding: 0.375rem 0.875rem; font-size: 0.8125rem; }
.mt-2 { margin-top: 0.5rem; }

/* Step done icon */
.step-done-icon { font-size: 3rem; color: #22c55e; display: block; margin-bottom: 1rem; }

/* Error toast */
.error-toast {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  background: #ef4444;
  color: #fff;
  padding: 0.75rem 1.25rem;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  z-index: 100;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
}

@media (max-width: 640px) {
  .page { padding: 1rem; }
  .form-grid { grid-template-columns: 1fr; }
  .field--2x { grid-column: span 1; }
  .type-options { grid-template-columns: 1fr; }
  .wizard-steps { gap: 0; }
  .step-label { display: none; }
}
</style>
