// Composable de regras de agenda (horários + preços dinâmicos)
export const useScheduleRules = () => {
  const rules = useState<any[]>('scheduleRules', () => []);
  const loading = useState('scheduleRulesLoading', () => false);

  async function fetchRules(resourceId?: string) {
    loading.value = true;
    try {
      const url = resourceId ? `/api/schedule-rules?resourceId=${resourceId}` : '/api/schedule-rules';
      const data = await $fetch<any>(url);
      rules.value = data.rules || data || [];
    } catch (err) {
      console.error('Erro ao buscar regras:', err);
      rules.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function createRule(payload: {
    resourceId: string;
    weekday: number;
    startTime: string;
    endTime: string;
    priceModifier: number;
  }) {
    const data = await $fetch('/api/schedule-rules', {
      method: 'POST',
      body: payload,
    });
    await fetchRules();
    return data;
  }

  async function deleteRule(id: string) {
    await $fetch(`/api/schedule-rules/${id}`, { method: 'DELETE' });
    rules.value = rules.value.filter((r) => r.id !== id);
  }

  async function bulkSaveRules(resourceId: string, payload: any[]) {
    const data = await $fetch('/api/schedule-rules/bulk', {
      method: 'POST',
      body: { resourceId, rules: payload },
    });
    await fetchRules();
    return data;
  }

  return { rules, loading, fetchRules, createRule, deleteRule, bulkSaveRules };
};
