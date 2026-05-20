// Lógica de criação/gerenciamento de bookings com hold.
// Esta camada é "pura" (não acessa DB direto) — recebe injeção de adapters.
// Permite mockar em testes e em modo MOCK_PAYMENTS=1.

import { z } from 'zod';
import { addMinutes } from 'date-fns';
import { HoldExpiredError, SlotUnavailableError } from './errors';

// ============================================================
// Validações de entrada
// ============================================================

export const cartItemSchema = z.object({
  resourceId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  priceCents: z.number().int().positive(),
});

export const createHoldSchema = z.object({
  tenantId: z.string().uuid(),
  customerName: z.string().min(2).max(200),
  customerPhone: z.string().min(8).max(32),
  customerEmail: z.string().email().optional(),
  customerId: z.string().uuid().optional(), // se logado
  items: z.array(cartItemSchema).min(1).max(10),
  paymentMethod: z.enum(['pix_upfront', 'pay_on_site', 'deposit_plus_on_site']),
  customerNotes: z.string().max(1000).optional(),
});

export type CartItem = z.infer<typeof cartItemSchema>;
export type CreateHoldInput = z.infer<typeof createHoldSchema>;

// ============================================================
// Tipos de retorno (independentes do schema do DB)
// ============================================================

export type HoldResult = {
  bookingIds: string[];
  expiresAt: Date;
  totalCents: number;
};

// ============================================================
// Adapter interface — implementado pelo data layer (db ou mock)
// ============================================================

export interface BookingAdapter {
  insertBookingHold(args: {
    tenantId: string;
    resourceId: string;
    serviceId: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    customerId?: string;
    customerNotes?: string;
    startsAt: Date;
    endsAt: Date;
    totalCents: number;
    paymentMethod: 'pix_upfront' | 'pay_on_site' | 'deposit_plus_on_site';
    expiresAt: Date;
  }): Promise<{ id: string }>;

  setRedisHold(key: string, ttlSeconds: number): Promise<void>;

  releaseHold(bookingId: string): Promise<void>;
  confirmBooking(bookingId: string, confirmedAt: Date): Promise<void>;
}

// ============================================================
// Operações
// ============================================================

/**
 * Cria um hold para os itens do carrinho.
 * Se qualquer slot estiver indisponível (constraint única ou Redis), aborta tudo.
 */
export async function createHold(
  adapter: BookingAdapter,
  input: CreateHoldInput,
  holdMinutes: number,
  now: Date = new Date(),
): Promise<HoldResult> {
  const parsed = createHoldSchema.parse(input);
  const expiresAt = addMinutes(now, holdMinutes);

  const insertedIds: string[] = [];
  let totalCents = 0;

  // Insere um a um. Se algum falhar (constraint única violada),
  // liberamos os anteriores e propagamos erro amigável.
  for (const item of parsed.items) {
    try {
      const { id } = await adapter.insertBookingHold({
        tenantId: parsed.tenantId,
        resourceId: item.resourceId,
        serviceId: item.serviceId,
        customerName: parsed.customerName,
        customerPhone: parsed.customerPhone,
        customerEmail: parsed.customerEmail,
        customerId: parsed.customerId,
        customerNotes: parsed.customerNotes,
        startsAt: item.startsAt,
        endsAt: item.endsAt,
        totalCents: item.priceCents,
        paymentMethod: parsed.paymentMethod,
        expiresAt,
      });

      // Redis hold (cinto + suspensório)
      const key = redisHoldKey(item.resourceId, item.startsAt);
      await adapter.setRedisHold(key, holdMinutes * 60);

      insertedIds.push(id);
      totalCents += item.priceCents;
    } catch (err) {
      // Rollback dos holds já criados
      for (const id of insertedIds) {
        await adapter.releaseHold(id).catch(() => {});
      }
      throw new SlotUnavailableError();
    }
  }

  return { bookingIds: insertedIds, expiresAt, totalCents };
}

/**
 * Confirma um booking depois do pagamento aprovado.
 */
export async function confirmAfterPayment(
  adapter: BookingAdapter,
  bookingId: string,
  expiresAt: Date | null,
  now: Date = new Date(),
): Promise<void> {
  if (expiresAt && expiresAt < now) {
    throw new HoldExpiredError();
  }
  await adapter.confirmBooking(bookingId, now);
}

export function redisHoldKey(resourceId: string, startsAt: Date): string {
  return `hold:${resourceId}:${startsAt.toISOString()}`;
}
