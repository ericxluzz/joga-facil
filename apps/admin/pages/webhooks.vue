<template>
  <div>
    <h1 class="page-title">Webhooks</h1>
    <div class="filter-row">
      <label>
        <input v-model="showUnprocessed" type="checkbox" /> Apenas não processados
      </label>
      <button class="btn-sm" @click="load">Atualizar</button>
    </div>
    <div class="table-card">
      <div v-if="loading" class="loading">Carregando...</div>
      <table v-else class="table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Provider</th>
            <th>Tipo</th>
            <th>External ID</th>
            <th>Processado</th>
            <th>Erro</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in events" :key="w.id">
            <td>{{ formatDate(w.createdAt) }}</td>
            <td>{{ w.provider }}</td>
            <td><code>{{ w.eventType }}</code></td>
            <td><code class="truncate">{{ w.externalId?.substring(0, 24) }}</code></td>
            <td>
              <span :class="w.processedAt ? 'badge badge--ok' : 'badge badge--warn'">
                {{ w.processedAt ? 'Sim' : 'Não' }}
              </span>
            </td>
            <td class="error-cell">{{ w.error || '—' }}</td>
            <td>
              <button
                v-if="!w.processedAt"
                class="btn-xs"
                :disabled="reprocessing === w.id"
                @click="reprocess(w.id)"
              >
                {{ reprocessing === w.id ? '...' : 'Reprocessar' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'admin-only' });

const loading = ref(true);
const events = ref<any[]>([]);
const showUnprocessed = ref(false);
const reprocessing = ref<string | null>(null);

function formatDate(iso: string) { return iso ? new Date(iso).toLocaleString('pt-BR') : '-'; }

async function load() {
  loading.value = true;
  try {
    const res = await $fetch<{ events: any[] }>('/api/admin/webhook-events', {
      query: { unprocessed: showUnprocessed.value ? '1' : undefined },
    });
    events.value = res.events;
  } finally {
    loading.value = false;
  }
}

async function reprocess(id: string) {
  reprocessing.value = id;
  try {
    await $fetch(`/api/admin/webhook-events/${id}/reprocess`, { method: 'POST' });
    await load();
  } catch (e: any) {
    alert(e?.data?.message || 'Erro ao reprocessar');
  } finally {
    reprocessing.value = null;
  }
}

onMounted(() => load());
watch(showUnprocessed, () => load());
</script>

<style scoped>
.page-title { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0 0 1rem; }
.filter-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; font-size: 0.875rem; }
.btn-sm, .btn-xs {
  padding: 0.375rem 0.75rem;
  background: #0f172a; color: #fff;
  border: none; border-radius: 6px;
  font-size: 0.8125rem; font-weight: 600;
  cursor: pointer; font-family: inherit;
}
.btn-xs { padding: 0.25rem 0.5rem; font-size: 0.75rem; }
.btn-sm:hover, .btn-xs:hover { background: #1e293b; }
.btn-xs:disabled { opacity: 0.5; cursor: not-allowed; }
.loading { color: #64748b; padding: 1rem; }
.table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
.table th { padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
.table td { padding: 0.625rem 1rem; border-bottom: 1px solid #f1f5f9; color: #0f172a; }
.truncate { max-width: 200px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.error-cell { color: #ef4444; font-size: 0.75rem; max-width: 200px; }
.badge { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.badge--ok { background: #dcfce7; color: #166534; }
.badge--warn { background: #fffbeb; color: #92400e; }
</style>
