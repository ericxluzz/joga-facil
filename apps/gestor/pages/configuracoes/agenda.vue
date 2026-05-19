<template>
  <div class="config-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Horários de Funcionamento</h1>
        <p class="page-subtitle">Defina quando cada quadra está disponível e os preços por faixa.</p>
      </div>
      <Button label="Salvar tudo" icon="pi pi-check" :loading="saving" @click="saveAll" />
    </header>

    <div v-if="loadingResources" class="loading-state">
      <Skeleton width="100%" height="280px" class="mb-3" v-for="i in 2" :key="i" />
    </div>

    <div v-else-if="resources.length === 0" class="empty-state">
      <i class="pi pi-objects-column empty-icon" />
      <h3>Nenhuma quadra para configurar</h3>
      <p>Cadastre quadras primeiro em <NuxtLink to="/configuracoes/quadras">Quadras</NuxtLink>.</p>
    </div>

    <div v-else>
      <Tabs v-model:value="activeResource">
        <TabList>
          <Tab v-for="r in resources" :key="r.id" :value="r.id">{{ r.name }}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel v-for="r in resources" :key="r.id" :value="r.id">
            <ResourceScheduleEditor :resource="r" :rules="rulesByResource[r.id] || []" @change="onChange(r.id, $event)" />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import Button from 'primevue/button';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import Skeleton from 'primevue/skeleton';

definePageMeta({ layout: 'default' });

const { resources, loading: loadingResources, fetchResources } = useResources();
const { rules, fetchRules, bulkSaveRules } = useScheduleRules();
const toast = useToast?.();

const activeResource = ref<string>('');
const saving = ref(false);

// Estado local de regras editáveis por resource (id => array de regras)
const rulesByResource = reactive<Record<string, any[]>>({});

onMounted(async () => {
  await fetchResources();
  await fetchRules();
  // Agrupa as regras por resource
  for (const r of resources.value) {
    rulesByResource[r.id] = rules.value.filter((rule) => rule.resourceId === r.id);
  }
  activeResource.value = resources.value[0]?.id || '';
});

watch(rules, (val) => {
  for (const r of resources.value) {
    rulesByResource[r.id] = val.filter((rule) => rule.resourceId === r.id);
  }
});

function onChange(resourceId: string, newRules: any[]) {
  rulesByResource[resourceId] = newRules;
}

async function saveAll() {
  saving.value = true;
  try {
    for (const resourceId of Object.keys(rulesByResource)) {
      await bulkSaveRules(resourceId, rulesByResource[resourceId]);
    }
    toast?.add?.({ severity: 'success', summary: 'Salvo!', detail: 'Horários atualizados.', life: 2500 });
  } catch (err) {
    toast?.add?.({ severity: 'error', summary: 'Erro', detail: 'Não foi possível salvar.', life: 4000 });
  } finally {
    saving.value = false;
  }
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

.empty-state {
  display: flex; flex-direction: column; align-items: center;
  padding: 4rem 1rem; text-align: center; color: var(--p-text-color-secondary);
}
.empty-icon { font-size: 3rem; color: var(--p-primary-400); margin-bottom: 1rem; }
.empty-state h3 { margin: 0; font-size: 1.2rem; color: var(--p-text-color); }
.empty-state p { margin: 0.25rem 0 0; font-size: 0.9rem; }
.empty-state a { color: var(--p-primary-600); font-weight: 500; }

.mb-3 { margin-bottom: 0.75rem; }
</style>
