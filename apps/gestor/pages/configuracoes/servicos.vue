<template>
  <div class="config-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Tipos de Serviço</h1>
        <p class="page-subtitle">Defina o que pode ser reservado (ex: 1h Society, 2h com bola).</p>
      </div>
      <Button label="Novo serviço" icon="pi pi-plus" @click="openCreateDialog" />
    </header>

    <Card class="table-card">
      <template #content>
        <div v-if="loading" class="loading-state">
          <Skeleton width="100%" height="50px" class="mb-2" v-for="i in 4" :key="i" />
        </div>
        <div v-else-if="services.length === 0" class="empty-state">
          <i class="pi pi-tag empty-icon" />
          <h3>Nenhum serviço cadastrado</h3>
          <p>Crie pelo menos um tipo de serviço para começar.</p>
          <Button label="Cadastrar serviço" icon="pi pi-plus" @click="openCreateDialog" class="mt-2" />
        </div>
        <DataTable v-else :value="services" stripedRows>
          <Column field="name" header="Nome">
            <template #body="slotProps">
              <div class="service-cell">
                <strong>{{ slotProps.data.name }}</strong>
                <span v-if="slotProps.data.description" class="service-desc">{{ slotProps.data.description }}</span>
              </div>
            </template>
          </Column>
          <Column header="Duração">
            <template #body="slotProps">
              {{ slotProps.data.durationMinutes }} min
            </template>
          </Column>
          <Column header="Preço base">
            <template #body="slotProps">
              <strong>{{ formatBRL(slotProps.data.basePriceCents) }}</strong>
            </template>
          </Column>
          <Column header="Vinculada a">
            <template #body="slotProps">
              {{ slotProps.data.resourceName || 'Todas as quadras' }}
            </template>
          </Column>
          <Column header="Status">
            <template #body="slotProps">
              <Tag :value="slotProps.data.active ? 'Ativo' : 'Inativo'"
                :severity="slotProps.data.active ? 'success' : 'secondary'" />
            </template>
          </Column>
          <Column header="Ações" class="actions-column">
            <template #body="slotProps">
              <div class="action-buttons">
                <Button icon="pi pi-pencil" severity="secondary" outlined rounded
                  v-tooltip.top="'Editar'" @click="openEditDialog(slotProps.data)" />
                <Button icon="pi pi-trash" severity="danger" outlined rounded
                  v-tooltip.top="'Excluir'" @click="confirmDelete(slotProps.data)" />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Dialog -->
    <Dialog v-model:visible="dialogVisible" :header="editing ? 'Editar serviço' : 'Novo serviço'"
      modal :style="{ width: '500px' }">
      <form @submit.prevent="save" class="dialog-form">
        <div class="field">
          <label for="s-name">Nome *</label>
          <InputText id="s-name" v-model="form.name" placeholder="Ex: 1h Society" required class="w-full" />
        </div>
        <div class="field">
          <label for="s-desc">Descrição (opcional)</label>
          <InputText id="s-desc" v-model="form.description" placeholder="Inclui bola, vestiário..." class="w-full" />
        </div>
        <div class="field-row">
          <div class="field">
            <label for="s-duration">Duração (min) *</label>
            <InputNumber id="s-duration" v-model="form.durationMinutes" :min="15" :step="15" suffix=" min" class="w-full" />
          </div>
          <div class="field">
            <label for="s-price">Preço base *</label>
            <InputNumber id="s-price" v-model="form.priceReais" mode="currency" currency="BRL" locale="pt-BR" :minFractionDigits="2" class="w-full" />
          </div>
        </div>
        <div class="field">
          <label for="s-resource">Vincular a uma quadra (opcional)</label>
          <Select id="s-resource" v-model="form.resourceId" :options="resourceOptions"
            optionLabel="label" optionValue="value" placeholder="Todas as quadras" showClear class="w-full" />
          <small class="hint">Vazio = válido pra todas as quadras.</small>
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
import { ref, reactive, computed, onMounted } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Skeleton from 'primevue/skeleton';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import Tag from 'primevue/tag';

definePageMeta({ layout: 'default' });

const { services, loading, fetchServices, createService, updateService, deleteService } = useServices();
const { resources, fetchResources } = useResources();
const toast = useToast?.();

const dialogVisible = ref(false);
const saving = ref(false);
const editing = ref<any>(null);
const form = reactive<{
  name: string;
  description: string;
  durationMinutes: number;
  priceReais: number;
  resourceId: string | null;
}>({ name: '', description: '', durationMinutes: 60, priceReais: 100, resourceId: null });

const resourceOptions = computed(() =>
  (resources.value || []).map((r) => ({ label: r.name, value: r.id })),
);

onMounted(async () => {
  await Promise.all([fetchServices(), fetchResources()]);
});

function openCreateDialog() {
  editing.value = null;
  Object.assign(form, { name: '', description: '', durationMinutes: 60, priceReais: 100, resourceId: null });
  dialogVisible.value = true;
}

function openEditDialog(service: any) {
  editing.value = service;
  Object.assign(form, {
    name: service.name,
    description: service.description || '',
    durationMinutes: service.durationMinutes,
    priceReais: service.basePriceCents / 100,
    resourceId: service.resourceId,
  });
  dialogVisible.value = true;
}

async function save() {
  saving.value = true;
  try {
    const payload = {
      name: form.name,
      description: form.description,
      durationMinutes: form.durationMinutes,
      basePriceCents: Math.round(form.priceReais * 100),
      resourceId: form.resourceId,
    };
    if (editing.value) {
      await updateService(editing.value.id, payload);
      toast?.add?.({ severity: 'success', summary: 'Atualizado!', detail: form.name, life: 2500 });
    } else {
      await createService(payload);
      toast?.add?.({ severity: 'success', summary: 'Criado!', detail: form.name, life: 2500 });
    }
    dialogVisible.value = false;
  } catch (err) {
    toast?.add?.({ severity: 'error', summary: 'Erro', detail: 'Não foi possível salvar.', life: 4000 });
  } finally {
    saving.value = false;
  }
}

async function confirmDelete(service: any) {
  if (!confirm(`Excluir o serviço "${service.name}"?`)) return;
  await deleteService(service.id);
  toast?.add?.({ severity: 'info', summary: 'Excluído', detail: service.name, life: 2000 });
}

function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}
</script>

<style scoped>
.config-page { width: 100%; }
.page-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 2rem; gap: 1rem; flex-wrap: wrap;
}
.page-title { margin: 0; font-size: 1.5rem; font-weight: 700; color: var(--p-text-color); }
.page-subtitle { margin: 0.25rem 0 0; color: var(--p-text-color-secondary); font-size: 0.9rem; }

.table-card :deep(.p-card-body) { padding: 1.5rem; }

.service-cell { display: flex; flex-direction: column; }
.service-desc { font-size: 0.8rem; color: var(--p-text-color-secondary); margin-top: 0.15rem; }

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
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.hint { font-size: 0.75rem; color: var(--p-text-color-secondary); }
.dialog-footer { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }

.mb-2 { margin-bottom: 0.5rem; }
.mt-2 { margin-top: 1rem; }
.w-full { width: 100%; }

@media (max-width: 640px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .field-row { grid-template-columns: 1fr; }
  .table-card :deep(.p-datatable-tbody td),
  .table-card :deep(.p-datatable-thead th) { font-size: 0.8rem; padding: 0.5rem; }
}
</style>
