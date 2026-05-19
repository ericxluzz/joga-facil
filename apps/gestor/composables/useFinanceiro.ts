// Composable do módulo financeiro
export const useFinanceiro = () => {
  const summary = useState<any>('financeiroSummary', () => null);
  const payments = useState<any[]>('payments', () => []);
  const loading = useState('financeiroLoading', () => false);

  async function fetchSummary(params: { from?: string; to?: string } = {}) {
    loading.value = true;
    try {
      const search = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as any);
      const data = await $fetch<any>(`/api/financeiro/summary?${search.toString()}`);
      summary.value = data;
    } catch (err) {
      console.error('Erro ao buscar resumo:', err);
      summary.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchPayments(params: { status?: string; from?: string; to?: string } = {}) {
    loading.value = true;
    try {
      const search = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as any);
      const data = await $fetch<any>(`/api/financeiro/payments?${search.toString()}`);
      payments.value = data.payments || [];
    } catch (err) {
      console.error('Erro ao buscar pagamentos:', err);
      payments.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function exportCsv(params: { from?: string; to?: string } = {}) {
    const search = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as any);
    const blob = await $fetch(`/api/financeiro/export?${search.toString()}`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(blob as unknown as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agenda-slim-financeiro-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return { summary, payments, loading, fetchSummary, fetchPayments, exportCsv };
};
