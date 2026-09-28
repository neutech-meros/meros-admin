import { NAV, labelForKey, navI18nKey, parentOfKey } from '../nav-config';

describe('NAV', () => {
  it('has the 8 top-level groups in source order', () => {
    expect(NAV.map((g) => g.key)).toEqual([
      'dashboard',
      'users',
      'moderation',
      'categories',
      'analytics',
      'subscriptions',
      'bookings',
      'finance',
      'system',
    ]);
  });

  it('gives finance 2 sub-items ending with commissions', () => {
    const finance = NAV.find((g) => g.key === 'finance')!;
    expect(finance.sub).toHaveLength(2);
    expect(finance.sub![finance.sub!.length - 1]).toEqual({
      key: 'finance-commissions',
      label: 'Commissions',
    });
  });

  it('gives system 5 sub-items ending with terms & privacy', () => {
    const system = NAV.find((g) => g.key === 'system')!;
    expect(system.sub).toHaveLength(5);
    expect(system.sub![system.sub!.length - 1]).toEqual({
      key: 'system-terms',
      label: 'Terms & privacy',
    });
  });
});

describe('labelForKey', () => {
  it('returns a top-level group label', () => {
    expect(labelForKey('dashboard')).toBe('Overview');
  });
  it('returns a sub-item label', () => {
    expect(labelForKey('finance-commissions')).toBe('Commissions');
  });
  it('falls back to Overview for an unknown key', () => {
    expect(labelForKey('nope')).toBe('Overview');
  });
});

describe('parentOfKey', () => {
  it('finds the parent group of a sub-item', () => {
    expect(parentOfKey('finance-commissions')?.key).toBe('finance');
  });
  it('returns undefined for a top-level key', () => {
    expect(parentOfKey('dashboard')).toBeUndefined();
  });
});

describe('navI18nKey', () => {
  it('camel-cases a hyphenated key under the admin.nav namespace', () => {
    expect(navI18nKey('finance-commissions')).toBe('admin.nav.financeCommissions');
  });
  it('passes through a key with no hyphen', () => {
    expect(navI18nKey('dashboard')).toBe('admin.nav.dashboard');
  });
});
