// Composable do fluxo de reserva do cliente final
export const useReserva = () => {
  const tenant = useState<any>('clienteTenant', () => null);
  const slots = useState<any[]>('clienteSlots', () => []);
  const cart = useState<Set<string>>('clienteCart', () => new Set());
  const loadingTenant = useState('clienteTenantLoading', () => false);
  const loadingSlots = useState('clienteSlotsLoading', () => false);

  async function fetchTenant(slug: string) {
    loadingTenant.value = true;
    try {
      tenant.value = await $fetch(`/api/r/${slug}`);
    } catch (err) {
      console.error('Erro ao buscar tenant:', err);
      tenant.value = null;
    } finally {
      loadingTenant.value = false;
    }
  }

  async function fetchSlots(slug: string, date: string, resourceId?: string) {
    loadingSlots.value = true;
    try {
      const params = new URLSearchParams({ date });
      if (resourceId) params.set('resourceId', resourceId);
      const data = await $fetch<any>(`/api/r/${slug}/slots?${params.toString()}`);
      slots.value = data.slots || [];
    } catch (err) {
      console.error('Erro ao buscar slots:', err);
      slots.value = [];
    } finally {
      loadingSlots.value = false;
    }
  }

  function toggleCart(slotId: string) {
    if (cart.value.has(slotId)) cart.value.delete(slotId);
    else cart.value.add(slotId);
    cart.value = new Set(cart.value);
  }

  function clearCart() {
    cart.value = new Set();
  }

  const cartItems = computed(() =>
    slots.value.filter((s) => cart.value.has(s.id)),
  );

  const cartTotal = computed(() =>
    cartItems.value.reduce((sum, s) => sum + s.priceCents, 0),
  );

  async function createHold(slug: string, customer: { name: string; phone: string; email?: string }) {
    const items = cartItems.value;
    if (items.length === 0) throw new Error('Carrinho vazio');

    return await $fetch<any>(`/api/r/${slug}/hold`, {
      method: 'POST',
      body: {
        customer,
        slots: items.map((s) => ({
          slotId: s.id,
          resourceId: s.resourceId,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          priceCents: s.priceCents,
        })),
      },
    });
  }

  async function checkout(slug: string, payload: { holdId: string; method: 'pix_upfront' | 'pay_on_site'; customer: any }) {
    return await $fetch<any>(`/api/r/${slug}/checkout`, {
      method: 'POST',
      body: payload,
    });
  }

  async function pollPayment(paymentId: string): Promise<'pending' | 'paid' | 'expired' | 'failed'> {
    const res = await $fetch<any>(`/api/payment/${paymentId}/status`);
    return res.status;
  }

  return {
    tenant,
    slots,
    cart,
    cartItems,
    cartTotal,
    loadingTenant,
    loadingSlots,
    fetchTenant,
    fetchSlots,
    toggleCart,
    clearCart,
    createHold,
    checkout,
    pollPayment,
  };
};
