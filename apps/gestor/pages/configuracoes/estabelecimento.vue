<template>
  <div class="config-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Estabelecimento</h1>
        <p class="page-subtitle">Edite os dados que aparecem no seu link público.</p>
      </div>
      <div class="header-actions">
        <Button label="Copiar link público" icon="pi pi-link" outlined @click="copyLink" />
      </div>
    </header>

    <div v-if="loading" class="loading-state">
      <Skeleton width="100%" height="180px" class="mb-3" v-for="i in 3" :key="i" />
    </div>

    <form v-else @submit.prevent="save" class="form-grid">
      <Card class="form-card">
        <template #title>Identidade</template>
        <template #content>
          <div class="field-row">
            <div class="field">
              <label for="name">Nome do estabelecimento *</label>
              <InputText id="name" v-model="form.name" class="w-full" required />
            </div>
            <div class="field">
              <label for="slug">Link público *</label>
              <InputGroup>
                <InputGroupAddon>agenda-slim.com.br/r/</InputGroupAddon>
                <InputText id="slug" v-model="form.slug" />
              </InputGroup>
            </div>
          </div>
          <div class="field">
            <label for="description">Descrição (opcional)</label>
            <Textarea id="description" v-model="form.settings.description" rows="3" class="w-full" />
          </div>
        </template>
      </Card>

      <Card class="form-card">
        <template #title>Endereço & Contato</template>
        <template #content>
          <div class="field">
            <label for="address">Endereço completo</label>
            <InputText id="address" v-model="form.address" class="w-full" />
          </div>
          <div class="field-row">
            <div class="field">
              <label for="whatsapp">WhatsApp do estabelecimento</label>
              <InputMask id="whatsapp" v-model="form.settings.whatsapp" mask="(99) 99999-9999" placeholder="(51) 99999-9999" class="w-full" />
            </div>
            <div class="field">
              <label for="instagram">Instagram</label>
              <InputText id="instagram" v-model="form.settings.instagram" placeholder="@seuhandle" class="w-full" />
            </div>
          </div>
        </template>
      </Card>

      <Card class="form-card">
        <template #title>Foto de capa</template>
        <template #content>
          <div class="photo-upload">
            <div class="photo-preview" :style="photoPreviewStyle">
              <span v-if="!form.photoUrl" class="placeholder">
                <i class="pi pi-image" />
                Nenhuma imagem
              </span>
            </div>
            <div class="photo-actions">
              <label for="photoUrl">URL da Imagem de Capa</label>
              <InputText id="photoUrl" v-model="form.photoUrl" placeholder="https://images.unsplash.com/..." class="w-full" />
              <p class="hint">A foto aparece no topo da página pública. Cole a URL de uma imagem horizontal.</p>
            </div>
          </div>
        </template>
      </Card>

      <Card class="form-card">
        <template #title>Design & Personalização do PWA</template>
        <template #content>
          <div class="field mb-4">
            <label>Cor Principal da Marca (Cliente)</label>
            <div class="color-options">
              <button
                v-for="color in colorsList"
                :key="color.id"
                type="button"
                class="color-btn"
                :class="{ active: form.settings.primaryColor === color.id }"
                :style="{ borderColor: form.settings.primaryColor === color.id ? color.hex : 'transparent' }"
                @click="form.settings.primaryColor = color.id"
              >
                <span class="color-dot" :style="{ backgroundColor: color.hex }"></span>
                <span class="color-label">{{ color.label }}</span>
              </button>
            </div>
          </div>

          <div class="photo-upload mt-4">
            <div class="logo-preview" :style="logoPreviewStyle">
              <span v-if="!form.settings.logoUrl" class="placeholder">
                <i class="pi pi-user" />
                Logo
              </span>
            </div>
            <div class="photo-actions">
              <label for="logoUrl">URL do Logotipo (PWA)</label>
              <InputText id="logoUrl" v-model="form.settings.logoUrl" placeholder="https://..." class="w-full" />
              <p class="hint">O logotipo redondo aparece no topo do PWA. Cole a URL de uma imagem quadrada.</p>
            </div>
          </div>
        </template>
      </Card>

      <div class="actions-row">
        <Button label="Cancelar" severity="secondary" outlined type="button" @click="loadTenant" />
        <Button label="Salvar alterações" icon="pi pi-check" type="submit" :loading="saving" />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputMask from 'primevue/inputmask';
import InputGroup from 'primevue/inputgroup';
import InputGroupAddon from 'primevue/inputgroupaddon';
import Textarea from 'primevue/textarea';
import Skeleton from 'primevue/skeleton';

definePageMeta({ layout: 'default' });

const { tenant, loading, fetchTenant } = useTenant();
const saving = ref(false);
const toast = useToast?.();

const form = reactive<any>({
  name: '',
  slug: '',
  address: '',
  photoUrl: '',
  settings: {
    description: '',
    whatsapp: '',
    instagram: '',
    primaryColor: 'emerald',
    logoUrl: '',
  },
});

const colorsList = [
  { id: 'emerald', label: 'Verde (PIX)', hex: '#10B981' },
  { id: 'blue', label: 'Azul (Clínica)', hex: '#3B82F6' },
  { id: 'orange', label: 'Laranja (Quadras)', hex: '#F97316' },
  { id: 'purple', label: 'Roxo (Premium)', hex: '#A855F7' },
  { id: 'slate', label: 'Carbono (Sleek)', hex: '#475569' },
];

async function loadTenant() {
  await fetchTenant();
  if (tenant.value) {
    const data = JSON.parse(JSON.stringify(tenant.value));
    data.settings = {
      description: '',
      whatsapp: '',
      instagram: '',
      primaryColor: 'emerald',
      logoUrl: '',
      ...data.settings
    };
    Object.assign(form, data);
  }
}

onMounted(loadTenant);

const photoPreviewStyle = computed(() =>
  form.photoUrl
    ? { backgroundImage: `url(${form.photoUrl})` }
    : { background: 'var(--p-surface-100)' },
);

const logoPreviewStyle = computed(() =>
  form.settings?.logoUrl
    ? { backgroundImage: `url(${form.settings.logoUrl})` }
    : { background: 'var(--p-surface-100)' },
);

async function save() {
  saving.value = true;
  try {
    await $fetch('/api/tenant', { method: 'PATCH', body: form });
    toast?.add?.({ severity: 'success', summary: 'Salvo!', detail: 'Estabelecimento atualizado.', life: 2500 });
  } catch (err) {
    toast?.add?.({ severity: 'error', summary: 'Erro', detail: 'Não foi possível salvar.', life: 4000 });
  } finally {
    saving.value = false;
  }
}

async function copyLink() {
  const link = `${useRuntimeConfig().public.clientUrl}/r/${form.slug || 'meu-society'}`;
  await navigator.clipboard.writeText(link);
  toast?.add?.({ severity: 'success', summary: 'Copiado!', detail: link, life: 2000 });
}
</script>

<style scoped>
.config-page { width: 100%; }
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;
}
.page-title { margin: 0; font-size: 1.5rem; font-weight: 700; color: var(--p-text-color); }
.page-subtitle { margin: 0.25rem 0 0; color: var(--p-text-color-secondary); font-size: 0.9rem; }

.form-grid { display: flex; flex-direction: column; gap: 1rem; }
.form-card :deep(.p-card-body) { padding: 1.5rem; }

.field { display: flex; flex-direction: column; gap: 0.375rem; margin-bottom: 1rem; }
.field label { font-size: 0.85rem; font-weight: 500; color: var(--p-text-color); }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

.photo-upload { display: flex; gap: 1.5rem; align-items: center; flex-wrap: wrap; }
.photo-preview {
  width: 200px;
  height: 120px;
  background-size: cover;
  background-position: center;
  border-radius: 8px;
  border: 1px solid var(--p-surface-200);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--p-text-color-secondary);
}
.placeholder { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; font-size: 0.85rem; }
.placeholder i { font-size: 1.5rem; }
.photo-actions { display: flex; flex-direction: column; gap: 0.5rem; flex: 1; min-width: 260px; }
.photo-actions label { font-size: 0.85rem; font-weight: 500; }
.hint { font-size: 0.8rem; color: var(--p-text-color-secondary); margin: 0; line-height: 1.4; }

.actions-row { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem; }

.mb-3 { margin-bottom: 0.75rem; }
.mb-4 { margin-bottom: 1rem; }
.mt-4 { margin-top: 1rem; }
.w-full { width: 100%; }

.color-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
.color-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  background: var(--p-surface-100);
  border: 2px solid transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--p-text-color);
  transition: all 0.15s;
}
.color-btn:hover {
  background: var(--p-surface-200);
}
.color-btn.active {
  background: var(--p-surface-0);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}
.logo-preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  border: 1px solid var(--p-surface-200);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--p-text-color-secondary);
}

@media (max-width: 768px) {
  .field-row { grid-template-columns: 1fr; }
}
</style>
