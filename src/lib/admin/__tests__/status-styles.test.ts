import { statusStyle, typeStyle } from '../status-styles';

describe('statusStyle', () => {
  it('maps a positive status to the success tokens', () => {
    expect(statusStyle('Paid')).toEqual({
      color: 'var(--success)',
      background: 'var(--success-bg)',
    });
  });
  it('maps an unknown status to the neutral fallback', () => {
    expect(statusStyle('Whatever')).toEqual({
      color: 'var(--text-secondary)',
      background: 'var(--bg-surface-hover)',
    });
  });
  it('maps a danger status', () => {
    expect(statusStyle('Refunded')).toEqual({
      color: 'var(--danger)',
      background: 'var(--danger-bg)',
    });
  });
});

describe('typeStyle', () => {
  it('maps Creator to the info tokens', () => {
    expect(typeStyle('Creator')).toEqual({ color: 'var(--info)', background: 'var(--info-bg)' });
  });
  it('maps anything else to the neutral fallback', () => {
    expect(typeStyle('User')).toEqual({
      color: 'var(--text-secondary)',
      background: 'var(--bg-surface-hover)',
    });
  });
});
