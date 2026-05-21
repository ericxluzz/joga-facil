<template>
  <div class="config-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Estabelecimento</h1>
        <p class="page-subtitle">Dados que aparecem no seu link público.</p>
        <CopyLinkButton v-if="publicLink" :url="publicLink" class="mt-2" />
      </div>
      <div class="header-actions">
        <Button
          v-if="!editing"
          label="Editar"
          icon="pi pi-pencil"
          @click="startEditing"
        />
        <template v-else>
          <Button label="Cancelar" severity="secondary" outlined @click="cancelEditing" />
          <Button label="Salvar" icon="pi pi-check" @click="save" :loading="saving" />
        </template>
      </div>
    </header>

    <SectionSkeleton v-if="loading" variant="card" :height="200" />

    <form v-else @submit.prevent="save" class="form-grid">
      <EditableSection :editing="editing" title="Identidade" subtitle="Como o cliente vê seu estabelecimento.">
        <template #view>
          <div class="view-field">
            <span class="view-field-label">Nome</span>
            <span class="view-field-value">{{ form.name || '—' }}</span>
          </div>
          <div class="view-field">
            <span class="view-field-label">Link público</span>
            <span class="view-field-value">{{ slugPrefix }}{{ form.slug || '—' }}</span>
          </div>
          <div class="view-field">
            <span class="view-field-label">Descrição</span>
            <span class="view-field-value" :class="{ muted: !form.settings.description }">
              {{ form.settings.description || 'Nenhuma descrição configurada' }}
            </span>
          </div>
        </template>
        <template #edit>
          <div class="field-row">
            <div class="field">
              <label for="name">Nome do estabelecimento *</label>
              <InputText id="name" v-model="form.name" class="w-full" required />
            </div>
            <div class="field">
              <label for="slug">Link público *</label>
              <InputGroup>
                <InputGroupAddon>{{ slugPrefix }}</InputGroupAddon>
                <InputText id="slug" v-model="form.slug" />
              </InputGroup>
            </div>
          </div>
          <div class="field">
            <label for="description">Descrição (opcional)</label>
            <Textarea id="description" v-model="form.settings.description" rows="3" class="w-full" />
          </div>
        </template>
      </EditableSection>

      <EditableSection :editing="editing" title="Endereço & contato">
        <template #view>
          <div class="view-field">
            <span class="view-field-label">Endereço</span>
            <span class="view-field-value" :class="{ muted: !form.address }">
              {{ form.address || 'Endereço não cadastrado' }}
            </span>
          </div>
          <div class="view-field">
            <span class="view-field-label">WhatsApp</span>
            <span class="view-field-value" :class="{ muted: !form.settings.whatsapp }">
              {{ form.settings.whatsapp || 'Não informado' }}
            </span>
          </div>
          <div class="view-field">
            <span class="view-field-label">Instagram</span>
            <span class="view-field-value" :class="{ muted: !form.settings.instagram }">
              {{ form.settings.instagram || 'Não informado' }}
            </span>
          </div>
        </template>
        <template #edit>
          <div class="field">
            <label for="address">Endereço completo</label>
            <InputText id="address" v-model="form.address" class="w-full" />
          </div>
          <div class="field-row">
            <div class="field">
              <label for="whatsapp">WhatsApp</label>
              <InputMask
                id="whatsapp"
                v-model="form.settings.whatsapp"
                mask="(99) 99999-9999"
                placeholder="(51) 99999-9999"
                class="w-full"
              />
            </div>
            <div class="field">
              <label for="instagram">Instagram</label>
              <InputText
                id="instagram"
                v-model="form.settings.instagram"
                placeholder="@seuhandle"
                class="w-full"
              />
            </div>
          </div>
        </template>
      </EditableSection>

      <EditableSection :editing="editing" title="Foto de capa" subtitle="Aparece no topo da página pública.">
        <template #view>
          <div class="photo-view">
            <div class="photo-preview" :style="photoPreviewStyle">
              <span v-if="!form.photoUrl" class="placeholder">
                <i class="pi pi-image" /> Nenhuma imagem
              </span>
            </div>
          </div>
        </template>
        <template #edit>
          <div class="photo-upload">
            <div class="photo-preview" :style="photoPreviewStyle">
              <span v-if="!form.photoUrl" class="placeholder">
                <i class="pi pi-image" /> Nenhuma imagem
              </span>
            </div>
            <div class="photo-actions">
              <label>Foto de capa</label>
              <div class="upload-row">
                <label class="upload-btn" :class="{ loading: uploadingPhoto }">
                  <i :class="uploadingPhoto ? 'pi pi-spin pi-spinner' : 'pi pi-upload'" />
                  {{ uploadingPhoto ? 'Enviando…' : 'Enviar imagem' }}
                  <input type="file" accept="image/*" style="display:none" :disabled="uploadingPhoto" @change="uploadFile($event, 'photo')" />
                </label>
                <span v-if="form.photoUrl" class="upload-ok"><i class="pi pi-check-circle" /> Imagem salva</span>
              </div>
              <p class="hint">JPG, PNG ou WebP. Máx. 5MB. Recomendado: 1200×400px.</p>
            </div>
          </div>
        </template>
      </EditableSection>

      <EditableSection :editing="editing" title="Identidade Visual" subtitle="Cor e logo que o cliente vê no app.">
        <template #view>
          <div class="view-field">
            <span class="view-field-label">Cor principal</span>
            <span class="view-field-value">{{ colorsList.find(c => c.id === form.settings.primaryColor)?.label || 'Verde' }}</span>
          </div>
          <div class="view-field">
            <span class="view-field-label">Logotipo</span>
            <span class="view-field-value" :class="{ muted: !form.settings.logoUrl }">
              {{ form.settings.logoUrl ? 'Logo configurada' : 'Nenhuma logo enviada' }}
            </span>
          </div>
        </template>
        <template #edit>
          <div class="field">
            <label>Cor principal</label>
            <div class="color-options">
              <button
                v-for="color in colorsList"
                :key="color.id"
                type="button"
                class="color-btn"
                :class="{ active: form.settings.primaryColor === color.id, saving: savingColor && form.settings.primaryColor === color.id }"
                @click="selectColor(color.id)"
              >
                <span class="color-dot" :style="{ backgroundColor: color.hex }" />
                <span>{{ color.label }}</span>
              </button>
            </div>
          </div>

          <div class="field">
            <label>Logotipo</label>
            <div class="logo-upload-row">
              <div class="logo-preview-box" :style="logoPreviewStyle">
                <span v-if="!form.settings.logoUrl">{{ (form.name || 'A')[0].toUpperCase() }}</span>
              </div>
              <div class="photo-actions">
                <div class="upload-row">
                  <label class="upload-btn" :class="{ loading: uploadingLogo }">
                    <i :class="uploadingLogo ? 'pi pi-spin pi-spinner' : 'pi pi-upload'" />
                    {{ uploadingLogo ? 'Enviando…' : 'Enviar logo' }}
                    <input type="file" accept="image/*" style="display:none" :disabled="uploadingLogo" @change="openCropModal" />
                  </label>
                  <button v-if="form.settings.logoUrl" type="button" class="remove-btn" @click="form.settings.logoUrl = ''">
                    <i class="pi pi-trash" /> Remover
                  </button>
                </div>
                <p class="hint">JPG, PNG ou WebP. Máx. 5MB. Quadrado recomendado (ex: 200×200px).</p>
              </div>
            </div>
          </div>
        </template>
      </EditableSection>
    </form>
  </div>

  <!-- Modal de crop do logo -->
  <LogoCropModal
    :visible="cropModalVisible"
    :file="pendingLogoFile"
    @confirm="onCropConfirm"
    @cancel="cropModalVisible = false"
  />
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputMask from 'primevue/inputmask';
import InputGroup from 'primevue/inputgroup';
import InputGroupAddon from 'primevue/inputgroupaddon';
import Textarea from 'primevue/textarea';

definePageMeta({ layout: 'default' });

const { tenant, loading, fetchTenant } = useTenant();
const config = useRuntimeConfig();
const saving = ref(false);
const editing = ref(false);
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

const slugPrefix = computed(() => {
  const url = (config.public.clientUrl as string) || '';
  return `${url.replace(/^https?:\/\//, '').replace(/\/$/, '')}/r/`;
});

const publicLink = computed(() => {
  if (!form.slug) return '';
  return `${config.public.clientUrl}/r/${form.slug}`;
});

const colorsList = [
  { id: 'emerald', label: 'Verde',    hex: '#10B981' },
  { id: 'blue',    label: 'Azul',     hex: '#3B82F6' },
  { id: 'orange',  label: 'Laranja',  hex: '#F97316' },
  { id: 'red',     label: 'Vermelho', hex: '#EF4444' },
  { id: 'purple',  label: 'Roxo',     hex: '#A855F7' },
  { id: 'slate',   label: 'Carbono',  hex: '#475569' },
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
      ...data.settings,
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
    ? { backgroundImage: `url(${form.settings.logoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {},
);

const uploadingPhoto   = ref(false);
const uploadingLogo    = ref(false);
const savingColor      = ref(false);
const cropModalVisible = ref(false);
const pendingLogoFile  = ref<File | null>(null);

async function selectColor(colorId: string) {
  form.settings.primaryColor = colorId;
  savingColor.value = true;
  try {
    const updated = await $fetch<any>('/api/tenant', { method: 'PATCH', body: form });
    tenant.value = updated;
  } catch {
    // silently ignore — o Salvar manual vai persistir
  } finally {
    savingColor.value = false;
  }
}

function openCropModal(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  pendingLogoFile.value = file;
  cropModalVisible.value = true;
  input.value = '';
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function sendUpload(blob: Blob, mimeType: string, uploadType: 'logo' | 'photo') {
  const data = await toBase64(blob);
  return $fetch<{ url: string }>('/api/tenant/upload', {
    method: 'POST',
    body: { data, mimeType, uploadType },
  });
}

async function onCropConfirm(blob: Blob) {
  cropModalVisible.value = false;
  uploadingLogo.value = true;
  try {
    const res = await sendUpload(blob, 'image/png', 'logo');
    form.settings.logoUrl = res.url;
    // Persiste imediatamente e atualiza o sidebar
    const updated = await $fetch<any>('/api/tenant', { method: 'PATCH', body: form });
    tenant.value = updated;
    toast?.add?.({ severity: 'success', summary: 'Logo atualizado!', life: 2000 });
  } catch (e: any) {
    toast?.add?.({ severity: 'error', summary: 'Erro no upload', detail: e?.data?.message || 'Tente novamente.', life: 4000 });
  } finally {
    uploadingLogo.value = false;
    pendingLogoFile.value = null;
  }
}

async function uploadFile(event: Event, type: 'photo') {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  uploadingPhoto.value = true;
  try {
    const res = await sendUpload(file, file.type || 'image/jpeg', type);
    form.photoUrl = res.url;
    // Persiste imediatamente e atualiza o sidebar
    const updated = await $fetch<any>('/api/tenant', { method: 'PATCH', body: form });
    tenant.value = updated;
    toast?.add?.({ severity: 'success', summary: 'Foto atualizada!', life: 2000 });
  } catch (e: any) {
    toast?.add?.({ severity: 'error', summary: 'Erro no upload', detail: e?.data?.message || 'Tente novamente.', life: 4000 });
  } finally {
    uploadingPhoto.value = false;
    input.value = '';
  }
}

function startEditing() {
  editing.value = true;
}

async function cancelEditing() {
  editing.value = false;
  await loadTenant();
}

async function save() {
  saving.value = true;
  try {
    const updated = await $fetch<any>('/api/tenant', { method: 'PATCH', body: form });
    // Atualiza o estado compartilhado para o sidebar refletir imediatamente
    tenant.value = updated;
    toast?.add?.({
      severity: 'success',
      summary: 'Salvo!',
      detail: 'Estabelecimento atualizado.',
      life: 2500,
    });
    editing.value = false;
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

.mt-2 {
  margin-top: 0.75rem;
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

.photo-upload {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.photo-view {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}

.photo-preview {
  width: 240px;
  height: 140px;
  background-size: cover;
  background-position: center;
  border-radius: 0.75rem;
  border: 1px solid var(--p-surface-200);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--p-text-color-secondary);
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.placeholder.small {
  font-size: 0.75rem;
}

.placeholder i {
  font-size: 1.5rem;
}

.photo-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  min-width: 260px;
}

.photo-actions label {
  font-size: 0.85rem;
  font-weight: 500;
}

.hint {
  font-size: 0.8rem;
  color: var(--p-text-color-secondary);
  margin: 0;
  line-height: 1.4;
}

.w-full {
  width: 100%;
}

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
  padding: 0.5rem 0.875rem;
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
  box-shadow: 0 0 0 2px var(--p-primary-300);
}

.color-btn.saving {
  opacity: 0.6;
  cursor: wait;
}

.color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: inline-block;
}

.color-line {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
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
  flex-shrink: 0;
}

.logo-preview.small {
  width: 40px;
  height: 40px;
}

.logo-line {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* Upload button */
.upload-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.upload-btn {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.5rem 1rem; border-radius: 8px;
  background: var(--p-surface-100); border: 1.5px solid var(--p-surface-300);
  font-size: 0.85rem; font-weight: 600; cursor: pointer;
  color: var(--p-text-color); font-family: inherit;
  transition: background .15s;
}
.upload-btn:hover { background: var(--p-surface-200); }
.upload-btn.loading { opacity: .7; cursor: wait; }
.upload-ok { font-size: .8rem; color: #16a34a; display: flex; align-items: center; gap: .3rem; }
.remove-btn {
  display: inline-flex; align-items: center; gap: .4rem;
  background: none; border: none; color: #dc2626; font-size: .82rem;
  font-weight: 600; cursor: pointer; font-family: inherit; padding: .4rem .6rem;
  border-radius: 6px; transition: background .15s;
}
.remove-btn:hover { background: #fee2e2; }

/* Logo upload row */
.logo-upload-row { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.logo-preview-box {
  width: 72px; height: 72px; flex-shrink: 0;
  border-radius: 16px;
  background-color: var(--p-surface-200);
  border: 2px solid var(--p-surface-300);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem; font-weight: 800; color: var(--p-text-color-secondary);
  background-size: cover; background-position: center; overflow: hidden;
}

@media (max-width: 768px) {
  .field-row {
    grid-template-columns: 1fr;
  }
}
</style>
