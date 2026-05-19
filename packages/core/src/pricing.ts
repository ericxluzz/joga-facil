import type { Service, ScheduleRule } from '@agendaslim/db/schema';

/**
 * Calcula o preço de um slot aplicando o modificador da regra de agenda.
 * Retorna em centavos.
 */
export function calculateSlotPrice(
  basePriceCents: number,
  priceModifier: number | string,
): number {
  const modifier = typeof priceModifier === 'string' ? Number(priceModifier) : priceModifier;
  return Math.round(basePriceCents * modifier);
}

/**
 * Formata centavos em string BRL (R$ 100,00).
 */
export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Soma valores de múltiplos slots de carrinho.
 */
export function sumCart(slots: { totalCents: number }[]): number {
  return slots.reduce((acc, s) => acc + s.totalCents, 0);
}

export function matchPriceModifier(
  date: Date,
  rules: Pick<ScheduleRule, 'weekday' | 'startTime' | 'endTime' | 'priceModifier'>[],
): number {
  const weekday = date.getDay();
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const rule = rules.find(
    (r) => r.weekday === weekday && r.startTime <= time && r.endTime > time,
  );
  if (!rule) return 1;
  return typeof rule.priceModifier === 'string'
    ? Number(rule.priceModifier)
    : rule.priceModifier;
}

export type ServicePricing = Pick<Service, 'basePriceCents' | 'durationMinutes'>;
