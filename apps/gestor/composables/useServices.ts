// Composable de gerenciamento dos tipos de serviço
export const useServices = () => {
  const services = useState<any[]>('services', () => []);
  const loading = useState('servicesLoading', () => false);

  async function fetchServices() {
    loading.value = true;
    try {
      const data = await $fetch<any>('/api/services');
      services.value = data.services || data || [];
    } catch (err) {
      console.error('Erro ao buscar serviços:', err);
      services.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function createService(payload: {
    name: string;
    durationMinutes: number;
    basePriceCents: number;
    resourceId?: string | null;
    description?: string;
  }) {
    const data = await $fetch('/api/services', {
      method: 'POST',
      body: payload,
    });
    await fetchServices();
    return data;
  }

  async function updateService(id: string, payload: any) {
    const data = await $fetch(`/api/services/${id}`, {
      method: 'PATCH',
      body: payload,
    });
    await fetchServices();
    return data;
  }

  async function deleteService(id: string) {
    await $fetch(`/api/services/${id}`, { method: 'DELETE' });
    services.value = services.value.filter((s) => s.id !== id);
  }

  return { services, loading, fetchServices, createService, updateService, deleteService };
};
