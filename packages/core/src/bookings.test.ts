import { describe, it, expect, vi } from 'vitest';
import { createHold, type BookingAdapter } from './bookings';
import { SlotUnavailableError } from './errors';

const tenantId = '11111111-1111-1111-1111-111111111111';
const resourceId = '22222222-2222-2222-2222-222222222222';
const serviceId = '33333333-3333-3333-3333-333333333333';

function makeAdapter(opts: { failOn?: number } = {}): BookingAdapter & {
  inserts: any[];
  releases: string[];
} {
  let count = 0;
  const inserts: any[] = [];
  const releases: string[] = [];
  return {
    inserts,
    releases,
    insertBookingHold: vi.fn(async (args) => {
      count++;
      if (opts.failOn === count) throw new Error('unique violation');
      const id = `b${count}`;
      inserts.push({ id, ...args });
      return { id };
    }),
    setRedisHold: vi.fn(async () => {}),
    releaseHold: vi.fn(async (id) => {
      releases.push(id);
    }),
    confirmBooking: vi.fn(async () => {}),
  };
}

describe('createHold', () => {
  it('cria hold com sucesso para 1 item', async () => {
    const adapter = makeAdapter();
    const res = await createHold(
      adapter,
      {
        tenantId,
        customerName: 'Cliente',
        customerPhone: '51999999999',
        items: [
          {
            resourceId,
            serviceId,
            startsAt: new Date('2026-05-16T19:00:00Z'),
            endsAt: new Date('2026-05-16T20:00:00Z'),
            priceCents: 10000,
          },
        ],
        paymentMethod: 'pix_upfront',
      },
      10,
    );

    expect(res.bookingIds).toHaveLength(1);
    expect(res.totalCents).toBe(10000);
    expect(adapter.inserts).toHaveLength(1);
  });

  it('faz rollback se segundo item falhar', async () => {
    const adapter = makeAdapter({ failOn: 2 });
    await expect(
      createHold(
        adapter,
        {
          tenantId,
          customerName: 'Cliente',
          customerPhone: '51999999999',
          items: [
            {
              resourceId,
              serviceId,
              startsAt: new Date('2026-05-16T19:00:00Z'),
              endsAt: new Date('2026-05-16T20:00:00Z'),
              priceCents: 10000,
            },
            {
              resourceId,
              serviceId,
              startsAt: new Date('2026-05-16T20:00:00Z'),
              endsAt: new Date('2026-05-16T21:00:00Z'),
              priceCents: 10000,
            },
          ],
          paymentMethod: 'pix_upfront',
        },
        10,
      ),
    ).rejects.toThrow(SlotUnavailableError);
    // O primeiro foi inserido e depois liberado
    expect(adapter.releases).toEqual(['b1']);
  });
});
