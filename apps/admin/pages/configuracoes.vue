<template>
  <div>
    <h1 class="page-title">Configurações da plataforma</h1>
    <div v-if="loading" class="loading">Carregando...</div>
    <div v-else class="settings-card">
      <div class="field">
        <label>Taxa da plataforma por reserva (centavos)</label>
        <input v-model.number="form.defaultPlatformFeeCents" type="number" min="0" />
        <span class="hint">{{ formatBRL(form.defaultPlatformFeeCents) }} por reserva</span>
      </div>
      <div class="field">
        <label>Expiração do PIX (minutos)</label>
        <input v-model.number="form.pixExpirationMinutes" type="number" min="5" max="60" />
      </div>
      <div class="field">
        <label>Ambiente ValidaPay</label>
        <select v-model="form.validapayEnv">
          <option value="sandbox">Sandbox</option>
          <option value="production">Produção</option>
        </select>
      </div>
      <div class="field field--checkbox">
        <label>
          <input v-model="form.maintenanceMode" type="checkbox" />
          Modo manutenção
        </label>
      </div>
      <div v-if="error" class="error-notice">{{ error }}</div>
      <div v-if="saved" class="success-notice">Configurações salvas!</div>
      <button class="btn-save" :disabled="saving" @click="save">
        {{ saving ? 'Salvando...' : 'Salvar configurações' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'admin-only' });

const loading = ref(true);
const saving = ref(false);
const saved = ref(false);
const error = ref('');
const form = reactive({
  defaultPlatformFeeCents: 500,
  pixExpirationMinutes: 15,
  validapayEnv: 'sandbox',
  maintenanceMode: false,
});

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

onMounted(async () => {
  try {
    const res = await $fetch<any>('/api/admin/platform-settings');
    Object.assign(form, res);
  } finally {
    loading.value = false;
  }
});

async function save() {
  saving.value = true;
  error.value = '';
  saved.value = false;
  try {
    await $fetch('/api/admin/platform-settings', { method: 'PUT', body: { ...form } });
    saved.value = true;
    setTimeout(() => (saved.value = false), 3000);
  } catch (e: any) {
    error.value = e?.data?.message || 'Erro ao salvar';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.page-title { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0 0 1.5rem; }
.loading { color: #64748b; }
.settings-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 2rem;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.field { display: flex; flex-direction: column; gap: 0.375rem; }
.field label { font-size: 0.875rem; font-weight: 600; color: #374151; }
.field input, .field select {
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: inherit;
  outline: none;
}
.field--checkbox label { flex-direction: row; align-items: center; gap: 0.5rem; display: flex; }
.hint { font-size: 0.75rem; color: #64748b; }
.error-notice { background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; border-radius: 8px; padding: 0.625rem; font-size: 0.875rem; }
.success-notice { background: #f0fdf4; border: 1px solid #86efac; color: #166534; border-radius: 8px; padding: 0.625rem; font-size: 0.875rem; }
.btn-save {
  padding: 0.75rem 1.5rem;
  background: #0f172a; color: #fff;
  border: none; border-radius: 10px;
  font-size: 0.9375rem; font-weight: 700;
  cursor: pointer; font-family: inherit;
  align-self: flex-start;
}
.btn-save:hover { background: #1e293b; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
