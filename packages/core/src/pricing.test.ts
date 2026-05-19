import { describe, it, expect } from 'vitest';
import { calculateSlotPrice, formatBRL, sumCart } from './pricing';

describe('pricing', () => {
  it('aplica modificador peak +30%', () => {
    expect(calculateSlotPrice(10000, 1.3)).toBe(13000);
    expect(calculateSlotPrice(10000, '1.30')).toBe(13000);
  });

  it('aplica modificador off-peak -20%', () => {
    expect(calculateSlotPrice(10000, 0.8)).toBe(8000);
  });

  it('formata BRL', () => {
    expect(formatBRL(10000).replace(/\s/g, ' ')).toMatch(/R\$\s?100,00/);
    expect(formatBRL(12345).replace(/\s/g, ' ')).toMatch(/R\$\s?123,45/);
  });

  it('soma carrinho', () => {
    expect(
      sumCart([{ totalCents: 10000 }, { totalCents: 13000 }, { totalCents: 8000 }]),
    ).toBe(31000);
  });
});
