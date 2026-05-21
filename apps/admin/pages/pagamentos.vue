<template>
  <div>
    <h1 class="page-title">Pagamentos</h1>
    <div class="table-card">
      <div v-if="loading" class="loading">Carregando...</div>
      <table v-else class="table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Arena</th>
            <th>Provider ID</th>
            <th>Valor</th>
            <th>Taxa plataforma</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in payments" :key="p.id">
            <td>{{ formatDate(p.createdAt) }}</td>
            <td>{{ p.tenantName }}</td>
            <td><code class="truncate">{{ p.providerPaymentId?.substring(0, 20) }}…</code></td>
            <td>{{ formatBRL(p.amountCents) }}</td>
            <td>{{ formatBRL(p.platformFeeCents) }}</td>
            <td><span :class="`badge badge--${p.status}`">{{ p.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'admin-only' });

const loading = ref(true);
const payments = ref<any[]>([]);

function formatDate(iso: string) { return iso ? new Date(iso).toLocaleDateString('pt-BR') : '-'; }
function formatBRL(cents: number) { return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

onMounted(async () => {
  try {
    const res = await $fetch<{ payments: any[] }>('/api/admin/payments');
    payments.value = res.payments;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.page-title { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0 0 1.5rem; }
.loading { color: #64748b; padding: 1rem; }
.table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.table th { padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
.table td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; color: #0f172a; }
.truncate { max-width: 160px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.badge--paid { background: #dcfce7; color: #166534; }
.badge--pending { background: #fffbeb; color: #92400e; }
.badge--expired, .badge--failed { background: #fef2f2; color: #991b1b; }
</style>
