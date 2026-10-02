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

  describe('report severity tones', () => {
    it('maps High to the danger tokens', () => {
      expect(statusStyle('High')).toEqual({
        color: 'var(--danger)',
        background: 'var(--danger-bg)',
      });
    });
    it('maps Average to the warning tokens', () => {
      expect(statusStyle('Average')).toEqual({
        color: 'var(--warning)',
        background: 'var(--warning-bg)',
      });
    });
    it('maps Low to the neutral tokens', () => {
      expect(statusStyle('Low')).toEqual({
        color: 'var(--text-secondary)',
        background: 'var(--bg-surface-hover)',
      });
    });
  });

  describe('report decision tones', () => {
    it('maps Kept to the success tokens', () => {
      expect(statusStyle('Kept')).toEqual({
        color: 'var(--success)',
        background: 'var(--success-bg)',
      });
    });
    it('maps Removed to the danger tokens', () => {
      expect(statusStyle('Removed')).toEqual({
        color: 'var(--danger)',
        background: 'var(--danger-bg)',
      });
    });
  });

  it('maps "More info" to the brand tokens', () => {
    expect(statusStyle('More info')).toEqual({
      color: 'var(--brand-600)',
      background: 'var(--brand-100)',
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
