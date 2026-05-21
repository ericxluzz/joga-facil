<template>
  <div>
    <div class="breadcrumb"><NuxtLink to="/arenas">← Arenas</NuxtLink></div>
    <div v-if="loading" class="loading">Carregando...</div>
    <div v-else-if="arena">
      <h1 class="page-title">{{ arena.name }}</h1>
      <div class="detail-grid">
        <div class="detail-card">
          <div class="detail-label">Slug</div>
          <div><code>{{ arena.slug }}</code></div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Plano</div>
          <div>{{ arena.plan }}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Status</div>
          <div><span :class="`badge badge--${arena.status}`">{{ arena.status }}</span></div>
        </div>
        <div class="detail-card">
          <div class="detail-label">KYC</div>
          <div><span :class="`badge badge--${kycStatus}`">{{ kycStatus }}</span></div>
        </div>
      </div>

      <div class="actions-row">
        <button
          v-if="arena.status === 'active'"
          class="btn-danger"
          @click="updateStatus('suspended')"
        >Suspender arena</button>
        <button
          v-else-if="arena.status === 'suspended'"
          class="btn-secondary"
          @click="updateStatus('active')"
        >Reativar arena</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'admin-only' });

const route = useRoute();
const id = route.params.id as string;
const loading = ref(true);
const arena = ref<any>(null);
const kycStatus = ref('not_started');

onMounted(async () => {
  try {
    const res = await $fetch<any>(`/api/admin/tenants/${id}`);
    arena.value = res.tenant;
    kycStatus.value = res.kycStatus || 'not_started';
  } finally {
    loading.value = false;
  }
});

async function updateStatus(newStatus: string) {
  await $fetch(`/api/admin/tenants/${id}`, { method: 'PATCH', body: { status: newStatus } });
  if (arena.value) arena.value.status = newStatus;
}
</script>

<style scoped>
.breadcrumb { margin-bottom: 1.5rem; font-size: 0.875rem; }
.breadcrumb a { color: #0f172a; text-decoration: none; font-weight: 600; }
.page-title { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0 0 1.5rem; }
.loading { color: #64748b; }
.detail-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
.detail-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem 1.25rem; }
.detail-label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 0.375rem; }
.badge { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.badge--active { background: #dcfce7; color: #166534; }
.badge--approved { background: #dcfce7; color: #166534; }
.badge--suspended, .badge--rejected { background: #fef2f2; color: #991b1b; }
.badge--pending_review, .badge--submitted { background: #fffbeb; color: #92400e; }
.badge--draft, .badge--not_started { background: #f1f5f9; color: #94a3b8; }
.actions-row { display: flex; gap: 1rem; }
.btn-danger, .btn-secondary {
  padding: 0.625rem 1.25rem;
  border: none; border-radius: 8px;
  font-size: 0.875rem; font-weight: 600;
  cursor: pointer; font-family: inherit;
}
.btn-danger { background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; }
.btn-secondary { background: #f1f5f9; color: #374151; }
</style>
