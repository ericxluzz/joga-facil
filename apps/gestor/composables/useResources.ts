// Composable de gerenciamento das quadras (resources)
export const useResources = () => {
  const resources = useState<any[]>('resources', () => []);
  const loading = useState('resourcesLoading', () => false);

  async function fetchResources() {
    loading.value = true;
    try {
      const data = await $fetch<any>('/api/resources');
      resources.value = data.resources || data || [];
    } catch (err) {
      console.error('Erro ao buscar quadras:', err);
      resources.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function createResource(payload: { name: string; type: string; photoUrl?: string }) {
    const data = await $fetch('/api/resources', {
      method: 'POST',
      body: payload,
    });
    await fetchResources();
    return data;
  }

  async function updateResource(id: string, payload: Partial<{ name: string; type: string; active: boolean }>) {
    const data = await $fetch(`/api/resources/${id}`, {
      method: 'PATCH',
      body: payload,
    });
    await fetchResources();
    return data;
  }

  async function deleteResource(id: string) {
    await $fetch(`/api/resources/${id}`, { method: 'DELETE' });
    resources.value = resources.value.filter((r) => r.id !== id);
  }

  return { resources, loading, fetchResources, createResource, updateResource, deleteResource };
};
