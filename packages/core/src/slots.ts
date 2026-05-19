// Algoritmo de geração de slots disponíveis.
//
// Dado: resource, service, data (YYYY-MM-DD), regras de agenda, bloqueios e reservas existentes.
// Retorna: lista de slots com hora de início, hora de fim, preço.
//
// Tratamento de timezone: todas as datas internas em UTC; comparações com regras
// (que armazenam time como string 'HH:mm') são feitas no timezone do tenant.

import { addMinutes, parse, format, isBefore, isAfter } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { calculateSlotPrice } from './pricing';

export type SlotInput = {
  date: string; // YYYY-MM-DD
  timezone: string; // ex: 'America/Sao_Paulo'
  durationMinutes: number;
  basePriceCents: number;
  rules: Array<{
    weekday: number;
    startTime: string;
    endTime: string;
    priceModifier: number | string;
  }>;
  blocks?: Array<{ startsAt: Date; endsAt: Date }>;
  existingBookings?: Array<{ startsAt: Date; endsAt: Date }>;
  // Restrições configuráveis pelo tenant
  minAdvanceMinutes?: number;
  maxAdvanceDays?: number;
  // Granularidade de geração (default = durationMinutes)
  stepMinutes?: number;
  // Now (testabilidade)
  now?: Date;
};

export type AvailableSlot = {
  startsAt: Date; // UTC
  endsAt: Date; // UTC
  priceCents: number;
  available: boolean;
  reason?: 'in_past' | 'min_advance' | 'max_advance' | 'blocked' | 'booked';
};

export function getAvailableSlots(input: SlotInput): AvailableSlot[] {
  const {
    date,
    timezone,
    durationMinutes,
    basePriceCents,
    rules,
    blocks = [],
    existingBookings = [],
    minAdvanceMinutes = 0,
    maxAdvanceDays = 365,
    stepMinutes = durationMinutes,
    now = new Date(),
  } = input;

  // Parse da data no timezone do tenant
  const dayStartLocal = parse(`${date} 00:00`, 'yyyy-MM-dd HH:mm', new Date());
  const targetWeekday = dayStartLocal.getDay();

  const applicableRules = rules.filter((r) => r.weekday === targetWeekday);
  if (applicableRules.length === 0) return [];

  const slots: AvailableSlot[] = [];
  const minStart = addMinutes(now, minAdvanceMinutes);
  const maxStart = addMinutes(now, maxAdvanceDays * 24 * 60);

  for (const rule of applicableRules) {
    // Constrói candidatos no time local, depois converte pra UTC
    const ruleStart = parse(`${date} ${rule.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const ruleEnd = parse(`${date} ${rule.endTime}`, 'yyyy-MM-dd HH:mm', new Date());

    let cursorLocal = ruleStart;
    while (true) {
      const slotEndLocal = addMinutes(cursorLocal, durationMinutes);
      if (isAfter(slotEndLocal, ruleEnd) && format(slotEndLocal, 'HH:mm') !== rule.endTime) break;

      const startsAtUtc = fromZonedTime(cursorLocal, timezone);
      const endsAtUtc = fromZonedTime(slotEndLocal, timezone);
      const priceCents = calculateSlotPrice(basePriceCents, rule.priceModifier);

      // Razões pelas quais o slot não pode ser reservado
      let available = true;
      let reason: AvailableSlot['reason'] | undefined;

      if (isBefore(startsAtUtc, now)) {
        available = false;
        reason = 'in_past';
      } else if (isBefore(startsAtUtc, minStart)) {
        available = false;
        reason = 'min_advance';
      } else if (isAfter(startsAtUtc, maxStart)) {
        available = false;
        reason = 'max_advance';
      } else if (overlapsAny(startsAtUtc, endsAtUtc, blocks)) {
        available = false;
        reason = 'blocked';
      } else if (overlapsAny(startsAtUtc, endsAtUtc, existingBookings)) {
        available = false;
        reason = 'booked';
      }

      slots.push({ startsAt: startsAtUtc, endsAt: endsAtUtc, priceCents, available, reason });

      cursorLocal = addMinutes(cursorLocal, stepMinutes);
      if (isAfter(cursorLocal, ruleEnd)) break;
    }
  }

  // Ordena por hora
  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

function overlapsAny(
  start: Date,
  end: Date,
  ranges: Array<{ startsAt: Date; endsAt: Date }>,
): boolean {
  return ranges.some((r) => start < r.endsAt && end > r.startsAt);
}
