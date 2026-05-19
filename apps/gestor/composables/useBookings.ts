// Composable centralizado de reservas
export const useBookings = () => {
  const bookings = useState<any[]>('bookings', () => []);
  const loading = useState('bookingsLoading', () => false);

  async function fetchBookings(params: {
    status?: string;
    date?: string;
    resourceId?: string;
    from?: string;
    to?: string;
  } = {}) {
    loading.value = true;
    try {
      const search = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null) as any,
      );
      const data = await $fetch<any>(`/api/bookings?${search.toString()}`);
      bookings.value = data.bookings || data || [];
    } catch (err) {
      console.error('Erro ao buscar reservas:', err);
      bookings.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function approve(id: string) {
    await $fetch(`/api/bookings/${id}/approve`, { method: 'PATCH' });
    bookings.value = bookings.value.map((b) =>
      b.id === id ? { ...b, status: 'confirmed' } : b,
    );
  }

  async function cancel(id: string, reason?: string) {
    await $fetch(`/api/bookings/${id}/cancel`, {
      method: 'PATCH',
      body: { reason },
    });
    bookings.value = bookings.value.map((b) =>
      b.id === id ? { ...b, status: 'cancelled' } : b,
    );
  }

  async function markNoShow(id: string) {
    await $fetch(`/api/bookings/${id}/no-show`, { method: 'PATCH' });
    bookings.value = bookings.value.map((b) =>
      b.id === id ? { ...b, status: 'no_show' } : b,
    );
  }

  return { bookings, loading, fetchBookings, approve, cancel, markNoShow };
};
