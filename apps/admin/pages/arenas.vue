<template>
  <div>
    <h1 class="page-title">Arenas</h1>
    <div class="table-card">
      <div v-if="loading" class="loading">Carregando...</div>
      <table v-else class="table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Slug</th>
            <th>Plano</th>
            <th>Status</th>
            <th>KYC</th>
            <th>Criado em</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in tenants" :key="t.id">
            <td><NuxtLink :to="`/arenas/${t.id}`" class="link">{{ t.name }}</NuxtLink></td>
            <td><code>{{ t.slug }}</code></td>
            <td>{{ t.plan }}</td>
            <td><span :class="`badge badge--${t.status}`">{{ t.status }}</span></td>
            <td><span :class="`badge badge--${t.kycStatus}`">{{ t.kycStatus || 'not_started' }}</span></td>
            <td>{{ formatDate(t.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'admin-only' });

const loading = ref(true);
const tenants = ref<any[]>([]);

function formatDate(iso: string) {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : '-';
}

onMounted(async () => {
  try {
    const res = await $fetch<{ tenants: any[] }>('/api/admin/tenants');
    tenants.value = res.tenants;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.page-title { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0 0 1.5rem; }
.loading { color: #64748b; }
.table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
.table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.table th { padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #e2e8f0; }
.table td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; color: #0f172a; }
.link { color: #0f172a; text-decoration: none; font-weight: 600; }
.link:hover { text-decoration: underline; }
.badge { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.badge--active { background: #dcfce7; color: #166534; }
.badge--approved { background: #dcfce7; color: #166534; }
.badge--suspended { background: #fef2f2; color: #991b1b; }
.badge--rejected { background: #fef2f2; color: #991b1b; }
.badge--pending_review { background: #fffbeb; color: #92400e; }
.badge--submitted { background: #fffbeb; color: #92400e; }
.badge--draft { background: #f1f5f9; color: #64748b; }
.badge--not_started { background: #f1f5f9; color: #94a3b8; }
</style>
