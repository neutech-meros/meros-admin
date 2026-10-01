import { NAV, isNavKeyEnabled, labelForKey, navI18nKey, parentOfKey } from '../nav-config';

describe('NAV', () => {
  it('has the 9 top-level groups that actually rendered in the reference HTML, in that order', () => {
    expect(NAV.map((g) => g.key)).toEqual([
      'dashboard',
      'users',
      'moderation',
      'catalog',
      'analytics',
      'subscriptions',
      'bookings',
      'finance',
      'system',
    ]);
  });

  it('gives finance exactly the 2 sub-items visible in the reference, ending with commissions', () => {
    const finance = NAV.find((g) => g.key === 'finance')!;
    expect(finance.sub).toHaveLength(2);
    expect(finance.sub![finance.sub!.length - 1]).toEqual({
      key: 'finance-commissions',
      label: 'Commissions',
    });
  });

  it('labels the catalog group "Categories", matching the rendered title (not the script\'s "Catalog")', () => {
    const catalog = NAV.find((g) => g.key === 'catalog')!;
    expect(catalog.label).toBe('Categories');
    expect(catalog.sub).toEqual([
      { key: 'catalog-categories', label: 'All categories' },
      { key: 'catalog-requests', label: 'Category requests' },
    ]);
  });

  it('orders analytics sub-items as rendered (World map before Sales by location)', () => {
    const analytics = NAV.find((g) => g.key === 'analytics')!;
    expect(analytics.sub!.map((s) => s.key)).toEqual([
      'analytics-map',
      'analytics-country',
      'analytics-searched',
    ]);
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

describe('isNavKeyEnabled', () => {
  it('enables exactly the shipped and in-flight screens, and their leaves', () => {
    const enabled = [...NAV.flatMap((g) => [g.key, ...(g.sub ?? []).map((s) => s.key)])].filter(
      isNavKeyEnabled,
    );
    expect(enabled).toEqual([
      'users',
      'moderation',
      'moderation-reported',
      'moderation-business',
      'catalog',
      'catalog-categories',
      'catalog-requests',
    ]);
  });

  it('disables Overview and every group with no screen behind it', () => {
    for (const key of [
      'dashboard',
      'analytics',
      'subscriptions',
      'bookings',
      'finance',
      'system',
    ]) {
      expect(isNavKeyEnabled(key)).toBe(false);
    }
  });

  it('disables the leaves of a disabled group too', () => {
    expect(isNavKeyEnabled('finance-commissions')).toBe(false);
    expect(isNavKeyEnabled('system-terms')).toBe(false);
  });
});
