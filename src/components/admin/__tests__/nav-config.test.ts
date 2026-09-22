import { NAV, labelForKey, navI18nKey, parentOfKey } from '../nav-config';

describe('NAV', () => {
  it('has the 13 top-level groups in source order', () => {
    expect(NAV.map((g) => g.key)).toEqual([
      'dashboard',
      'analytics',
      'lists',
      'users',
      'subscriptions',
      'bookings',
      'finance',
      'catalog',
      'campaigns',
      'moderation',
      'security',
      'monitoring',
      'system',
    ]);
  });

  it('gives finance 12 sub-items ending with statement', () => {
    const finance = NAV.find((g) => g.key === 'finance')!;
    expect(finance.sub).toHaveLength(12);
    expect(finance.sub![finance.sub!.length - 1]).toEqual({
      key: 'finance-statement',
      label: 'Statement',
    });
  });
});

describe('labelForKey', () => {
  it('returns a top-level group label', () => {
    expect(labelForKey('dashboard')).toBe('Overview');
  });
  it('returns a sub-item label', () => {
    expect(labelForKey('finance-payouts')).toBe('Payouts');
  });
  it('falls back to Overview for an unknown key', () => {
    expect(labelForKey('nope')).toBe('Overview');
  });
});

describe('parentOfKey', () => {
  it('finds the parent group of a sub-item', () => {
    expect(parentOfKey('finance-payouts')?.key).toBe('finance');
  });
  it('returns undefined for a top-level key', () => {
    expect(parentOfKey('dashboard')).toBeUndefined();
  });
});

describe('navI18nKey', () => {
  it('camel-cases a hyphenated key under the admin.nav namespace', () => {
    expect(navI18nKey('finance-payouts')).toBe('admin.nav.financePayouts');
  });
  it('passes through a key with no hyphen', () => {
    expect(navI18nKey('dashboard')).toBe('admin.nav.dashboard');
  });
});
