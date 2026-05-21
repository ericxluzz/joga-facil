import { getActiveTenant } from '../utils/tenant';
import { createSupabaseAdmin } from '../utils/supabase-admin';

type NotificationType = 'pending_approval' | 'payment_received' | 'booking_confirmed';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  createdAt: string;
  bookingId?: string;
  paymentId?: string;
  amountCents?: number;
}

function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    (cents || 0) / 100,
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) return { notifications: [] };

  const admin = await createSupabaseAdmin(event);
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    { data: pending },
    { data: paid },
    { data: confirmed },
  ] = await Promise.all([
    admin
      .from('bookings')
      .select('id, customer_name, starts_at, total_cents, created_at, resources(name)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'pending_approval')
      .gte('created_at', last24h)
      .order('created_at', { ascending: false })
      .limit(10),

    admin
      .from('payments')
      .select(
        'id, paid_at, amount_cents, bookings!inner(id, customer_name, tenant_id, resources(name))',
      )
      .eq('bookings.tenant_id', tenant.id)
      .eq('status', 'paid')
      .gte('paid_at', last24h)
      .order('paid_at', { ascending: false })
      .limit(10),

    admin
      .from('bookings')
      .select('id, customer_name, starts_at, confirmed_at, resources(name)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'confirmed')
      .gte('confirmed_at', startOfToday.toISOString())
      .order('confirmed_at', { ascending: false })
      .limit(5),
  ]);

  const notifications: Notification[] = [];

  for (const row of (pending as any[]) || []) {
    notifications.push({
      id: `approval:${row.id}`,
      type: 'pending_approval',
      title: 'Nova reserva aguardando aprovação',
      description: `${row.customer_name} — ${row.resources?.name || 'Quadra'} às ${formatTime(row.starts_at)}`,
      createdAt: row.created_at,
      bookingId: row.id,
      amountCents: row.total_cents,
    });
  }

  for (const row of (paid as any[]) || []) {
    if (!row.paid_at) continue;
    notifications.push({
      id: `paid:${row.id}`,
      type: 'payment_received',
      title: `Pagamento recebido — ${formatBRL(row.amount_cents)}`,
      description: `${row.bookings?.customer_name || 'Cliente'} — ${row.bookings?.resources?.name || 'Quadra'}`,
      createdAt: row.paid_at,
      paymentId: row.id,
      bookingId: row.bookings?.id,
      amountCents: row.amount_cents,
    });
  }

  for (const row of (confirmed as any[]) || []) {
    if (!row.confirmed_at) continue;
    notifications.push({
      id: `confirmed:${row.id}`,
      type: 'booking_confirmed',
      title: 'Reserva confirmada',
      description: `${row.customer_name} — ${row.resources?.name || 'Quadra'} às ${formatTime(row.starts_at)}`,
      createdAt: row.confirmed_at,
      bookingId: row.id,
    });
  }

  notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return { notifications: notifications.slice(0, 20) };
});
