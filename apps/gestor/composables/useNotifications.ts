import { useIntervalFn } from '@vueuse/core';

export type Notification = {
  id: string;
  type: 'pending_approval' | 'payment_received' | 'booking_confirmed';
  title: string;
  description: string;
  createdAt: string;
  bookingId?: string;
  paymentId?: string;
  amountCents?: number;
};

const STORAGE_KEY = 'joga-facil-last-seen-notifications';

export const useNotifications = () => {
  const items = useState<Notification[]>('notifications', () => []);
  const loading = useState('notificationsLoading', () => false);
  const lastSeenAt = useState<number>('notificationsLastSeen', () => {
    if (import.meta.client) {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? Number(raw) : 0;
    }
    return 0;
  });

  const unseenCount = computed(() =>
    items.value.filter((n) => new Date(n.createdAt).getTime() > lastSeenAt.value).length,
  );

  const pendingApprovalsCount = computed(
    () => items.value.filter((n) => n.type === 'pending_approval').length,
  );

  async function fetchNotifications() {
    loading.value = true;
    try {
      const data = await $fetch<{ notifications: Notification[] }>('/api/notifications');
      items.value = data.notifications || [];
    } catch (err) {
      console.error('[useNotifications] erro:', err);
    } finally {
      loading.value = false;
    }
  }

  function markAllSeen() {
    const ts = Date.now();
    lastSeenAt.value = ts;
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, String(ts));
  }

  let interval: ReturnType<typeof useIntervalFn> | null = null;

  function startPolling(everyMs = 30_000) {
    if (interval) return;
    fetchNotifications();
    interval = useIntervalFn(fetchNotifications, everyMs);
  }

  function stopPolling() {
    interval?.pause();
    interval = null;
  }

  return {
    items,
    loading,
    unseenCount,
    pendingApprovalsCount,
    fetchNotifications,
    markAllSeen,
    startPolling,
    stopPolling,
  };
};
