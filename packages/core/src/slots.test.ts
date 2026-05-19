import { describe, it, expect } from 'vitest';
import { getAvailableSlots } from './slots';

const TZ = 'America/Sao_Paulo';

describe('getAvailableSlots', () => {
  const baseRule = {
    weekday: 6, // sábado
    startTime: '08:00',
    endTime: '23:00',
    priceModifier: '1.00',
  };

  it('gera slots de 1h em sábado 8h-23h', () => {
    const now = new Date('2026-05-15T12:00:00Z'); // sexta
    const slots = getAvailableSlots({
      date: '2026-05-16',
      timezone: TZ,
      durationMinutes: 60,
      basePriceCents: 10000,
      rules: [baseRule],
      now,
    });
    // 8h-23h em slots de 1h => 15 slots
    expect(slots.length).toBe(15);
    expect(slots.every((s) => s.priceCents === 10000)).toBe(true);
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it('aplica price modifier peak', () => {
    const now = new Date('2026-05-15T12:00:00Z');
    const slots = getAvailableSlots({
      date: '2026-05-16',
      timezone: TZ,
      durationMinutes: 60,
      basePriceCents: 10000,
      rules: [
        { weekday: 6, startTime: '08:00', endTime: '18:00', priceModifier: '1.00' },
        { weekday: 6, startTime: '18:00', endTime: '23:00', priceModifier: '1.30' },
      ],
      now,
    });
    const peakSlots = slots.filter((s) => s.priceCents === 13000);
    expect(peakSlots.length).toBe(5); // 18-23h
  });

  it('marca slots no passado como indisponíveis', () => {
    const now = new Date('2026-05-16T15:00:00.000Z'); // sábado 12h BRT (UTC-3)
    const slots = getAvailableSlots({
      date: '2026-05-16',
      timezone: TZ,
      durationMinutes: 60,
      basePriceCents: 10000,
      rules: [baseRule],
      now,
    });
    const past = slots.filter((s) => !s.available && s.reason === 'in_past');
    expect(past.length).toBeGreaterThan(0);
  });

  it('respeita antecedência mínima', () => {
    const now = new Date('2026-05-16T11:00:00.000Z'); // sábado 8h BRT
    const slots = getAvailableSlots({
      date: '2026-05-16',
      timezone: TZ,
      durationMinutes: 60,
      basePriceCents: 10000,
      rules: [baseRule],
      minAdvanceMinutes: 120, // 2h
      now,
    });
    // Slots em <2h não disponíveis
    const tooSoon = slots.filter((s) => !s.available && s.reason === 'min_advance');
    expect(tooSoon.length).toBeGreaterThan(0);
  });

  it('bloqueia slots com reservas existentes', () => {
    const now = new Date('2026-05-15T12:00:00Z');
    const slots = getAvailableSlots({
      date: '2026-05-16',
      timezone: TZ,
      durationMinutes: 60,
      basePriceCents: 10000,
      rules: [baseRule],
      existingBookings: [
        {
          startsAt: new Date('2026-05-16T19:00:00Z'), // 16h BRT
          endsAt: new Date('2026-05-16T20:00:00Z'),
        },
      ],
      now,
    });
    const booked = slots.filter((s) => !s.available && s.reason === 'booked');
    expect(booked.length).toBe(1);
  });

  it('respeita bloqueios manuais', () => {
    const now = new Date('2026-05-15T12:00:00Z');
    const slots = getAvailableSlots({
      date: '2026-05-16',
      timezone: TZ,
      durationMinutes: 60,
      basePriceCents: 10000,
      rules: [baseRule],
      blocks: [
        {
          startsAt: new Date('2026-05-16T11:00:00Z'), // 8h BRT
          endsAt: new Date('2026-05-16T14:00:00Z'), // 11h BRT
        },
      ],
      now,
    });
    const blocked = slots.filter((s) => !s.available && s.reason === 'blocked');
    expect(blocked.length).toBe(3); // 8h, 9h, 10h
  });

  it('retorna vazio quando weekday não tem regra', () => {
    const now = new Date('2026-05-15T12:00:00Z');
    const slots = getAvailableSlots({
      date: '2026-05-17', // domingo
      timezone: TZ,
      durationMinutes: 60,
      basePriceCents: 10000,
      rules: [baseRule], // só sábado
      now,
    });
    expect(slots).toEqual([]);
  });
});
