import { formatBRL, formatNumberBRL } from '../format';

describe('formatBRL', () => {
  it('formats an integer as pt-BR currency without cents', () => {
    expect(formatBRL(1842900)).toBe('R$ 1.842.900');
  });
  it('formats a value with cents', () => {
    expect(formatBRL(42.7)).toBe('R$ 42,70');
  });
});

describe('formatNumberBRL', () => {
  it('formats large integers with pt-BR thousands separators', () => {
    expect(formatNumberBRL(48290)).toBe('48.290');
  });
});
