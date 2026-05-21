// Composable para gerenciar o tenant ativo do gestor logado
export const useTenant = () => {
  const tenant = useState<any>('currentTenant', () => null);
  const loading = useState('tenantLoading', () => false);

  async function fetchTenant() {
    loading.value = true;
    try {
      const data = await $fetch('/api/tenant', { method: 'GET' });
      tenant.value = data;
    } catch {
      tenant.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function createTenant(payload: any) {
    const data = await $fetch('/api/tenant', {
      method: 'POST',
      body: payload,
    });
    tenant.value = data;
    return data;
  }

  async function updateSettings(settings: any) {
    const data = await $fetch('/api/tenant/settings', {
      method: 'PATCH',
      body: settings,
    });
    if (tenant.value) tenant.value.settings = data.settings;
    return data;
  }

  return { tenant, loading, fetchTenant, createTenant, updateSettings };
};

// Versão SSR-friendly que usa useAsyncData e cache compartilhado.
// Use em páginas críticas dentro do <script setup>.
export const useTenantAsync = () => {
  const tenant = useState<any>('currentTenant', () => null);
  const promise = useAsyncData(
    'tenant',
    async () => {
      try {
        const data = await $fetch<any>('/api/tenant');
        tenant.value = data;
        return data;
      } catch {
        tenant.value = null;
        return null;
      }
    },
    { server: false, default: () => tenant.value },
  );
  return { tenant, ...promise };
};
