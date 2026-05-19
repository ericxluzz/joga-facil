export const useDashboardStats = () => {
  const stats = useState<any>('dashboardStats', () => null);
  const loading = useState('dashboardLoading', () => false);

  async function fetchStats() {
    loading.value = true;
    try {
      const data = await $fetch('/api/dashboard/stats');
      stats.value = data;
    } catch (err) {
      console.error('Erro ao buscar stats do dashboard:', err);
      stats.value = null;
    } finally {
      loading.value = false;
    }
  }

  return { stats, loading, fetchStats };
};
