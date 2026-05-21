<template>
  <div class="config-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Quadras</h1>
        <p class="page-subtitle">Cadastre e gerencie suas quadras (recursos reserváveis).</p>
      </div>
      <Button label="Nova quadra" icon="pi pi-plus" @click="openCreateDialog" />
    </header>

    <Card class="table-card">
      <template #content>
        <div v-if="loading" class="loading-state">
          <Skeleton width="100%" height="50px" class="mb-2" v-for="i in 4" :key="i" />
        </div>
        <div v-else-if="resources.length === 0" class="empty-state">
          <i class="pi pi-objects-column empty-icon" />
          <h3>Nenhuma quadra cadastrada</h3>
          <p>Cadastre sua primeira quadra para começar a receber reservas.</p>
          <Button label="Cadastrar quadra" icon="pi pi-plus" @click="openCreateDialog" class="mt-2" />
        </div>
        <DataTable v-else :value="resources" stripedRows class="custom-table">
          <Column field="name" header="Nome">
            <template #body="slotProps">
              <div class="resource-cell">
                <span class="resource-name">{{ slotProps.data.name }}</span>
                <Tag :value="resourceTypeLabel(slotProps.data.type)" severity="secondary" />
              </div>
            </template>
          </Column>
          <Column header="Status">
            <template #body="slotProps">
              <Tag
                :value="slotProps.data.active ? 'Ativa' : 'Desativada'"
                :severity="slotProps.data.active ? 'success' : 'secondary'"
              />
            </template>
          </Column>
          <Column header="Ações" class="actions-column">
            <template #body="slotProps">
              <div class="action-buttons">
                <Button icon="pi pi-pencil" severity="secondary" outlined rounded
                  v-tooltip.top="'Editar'" @click="openEditDialog(slotProps.data)" />
                <Button
                  :icon="slotProps.data.active ? 'pi pi-eye-slash' : 'pi pi-eye'"
                  severity="secondary"
                  outlined
                  rounded
                  v-tooltip.top="slotProps.data.active ? 'Desativar' : 'Ativar'"
                  @click="toggleActive(slotProps.data)"
                />
                <Button icon="pi pi-trash" severity="danger" outlined rounded
                  v-tooltip.top="'Excluir'" @click="confirmDelete(slotProps.data)" />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Dialog Criar/Editar -->
    <Dialog v-model:visible="dialogVisible" :header="editing ? 'Editar quadra' : 'Nova quadra'"
      modal :style="{ width: '450px' }">
      <form @submit.prevent="save" class="dialog-form">
        <div class="field">
          <label for="r-name">Nome *</label>
          <InputText id="r-name" v-model="form.name" placeholder="Ex: Society 1" required class="w-full" />
        </div>
        <div class="field">
          <label for="r-type">Tipo</label>
          <Select id="r-type" v-model="form.type" :options="typeOptions"
            optionLabel="label" optionValue="value" class="w-full" />
        </div>
        <div class="dialog-footer">
          <Button label="Cancelar" severity="secondary" outlined type="button" @click="dialogVisible = false" />
          <Button :label="editing ? 'Salvar' : 'Criar'" :loading="saving" type="submit" />
        </div>
      </form>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Skeleton from 'primevue/skeleton';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Tag from 'primevue/tag';

definePageMeta({ layout: 'default' });

const { resources, loading, fetchResources, createResource, updateResource, deleteResource } = useResources();
const toast = useToast?.();

const dialogVisible = ref(false);
const saving = ref(false);
const editing = ref<any>(null);
const form = reactive({ name: '', type: 'society' });

const typeOptions = [
  { label: 'Society', value: 'society' },
  { label: 'Padel', value: 'padel' },
  { label: 'Beach Tennis', value: 'beach' },
  { label: 'Tênis', value: 'tennis' },
  { label: 'Outro', value: 'other' },
];

function resourceTypeLabel(type: string) {
  return typeOptions.find((t) => t.value === type)?.label || type;
}

onMounted(fetchResources);

function openCreateDialog() {
  editing.value = null;
  Object.assign(form, { name: '', type: 'society' });
  dialogVisible.value = true;
}

function openEditDialog(resource: any) {
  editing.value = resource;
  Object.assign(form, { name: resource.name, type: resource.type });
  dialogVisible.value = true;
}

async function save() {
  saving.value = true;
  try {
    if (editing.value) {
      await updateResource(editing.value.id, { name: form.name, type: form.type });
      toast?.add?.({ severity: 'success', summary: 'Atualizada!', detail: form.name, life: 2500 });
    } else {
      await createResource({ name: form.name, type: form.type });
      toast?.add?.({ severity: 'success', summary: 'Criada!', detail: form.name, life: 2500 });
    }
    dialogVisible.value = false;
  } catch (err) {
    toast?.add?.({ severity: 'error', summary: 'Erro', detail: 'Não foi possível salvar.', life: 4000 });
  } finally {
    saving.value = false;
  }
}

async function toggleActive(resource: any) {
  await updateResource(resource.id, { active: !resource.active });
  toast?.add?.({
    severity: 'info',
    summary: resource.active ? 'Desativada' : 'Ativada',
    detail: resource.name,
    life: 2000,
  });
}

async function confirmDelete(resource: any) {
  if (!confirm(`Excluir "${resource.name}"? Reservas existentes serão preservadas.`)) return;
  await deleteResource(resource.id);
  toast?.add?.({ severity: 'info', summary: 'Excluída', detail: resource.name, life: 2000 });
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

.table-card :deep(.p-card-body) { padding: 1.5rem; }

.resource-cell { display: flex; align-items: center; gap: 0.75rem; }
.resource-name { font-weight: 600; }

.action-buttons { display: flex; gap: 0.5rem; }

.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 4rem 1rem; text-align: center; color: var(--p-text-color-secondary);
}
.empty-icon { font-size: 3rem; color: var(--p-primary-400); margin-bottom: 1rem; }
.empty-state h3 { margin: 0; font-size: 1.2rem; color: var(--p-text-color); }
.empty-state p { margin: 0.25rem 0 0; font-size: 0.9rem; }

.dialog-form { display: flex; flex-direction: column; gap: 1rem; }
.field { display: flex; flex-direction: column; gap: 0.375rem; }
.field label { font-size: 0.85rem; font-weight: 500; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }

.mb-2 { margin-bottom: 0.5rem; }
.mt-2 { margin-top: 1rem; }
.w-full { width: 100%; }

@media (max-width: 640px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .table-card :deep(.p-datatable-tbody td),
  .table-card :deep(.p-datatable-thead th) { font-size: 0.8rem; padding: 0.5rem; }
}
</style>
