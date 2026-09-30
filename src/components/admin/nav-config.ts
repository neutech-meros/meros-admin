import type { ComponentType } from 'react';

import {
  IconAnalytics,
  IconBookings,
  IconCatalog,
  IconDashboard,
  IconFinance,
  IconModeration,
  IconSubscriptions,
  IconSystem,
  IconUsers,
} from './icons';

export interface NavLeaf {
  key: string;
  label: string;
}

export interface NavGroup {
  key: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  sub?: NavLeaf[];
}

function leaves(pairs: [string, string][]): NavLeaf[] {
  return pairs.map(([key, label]) => ({ key, label }));
}

// This tree matches exactly what rendered in the reference HTML's captured
// DOM snapshot (order and sub-items), not the fuller `NAV` array present in
// the reference's script — several groups/sub-items never actually rendered
// there (missing icon data at capture time left them empty, or in
// Security's case, left the group entirely unreachable — its 11 leaves
// rendered but with no header to open them). Fidelity here means matching
// the rendered output, the same rule already applied to the dashboard KPI
// cards during planning.
export const NAV: NavGroup[] = [
  { key: 'dashboard', label: 'Overview', icon: IconDashboard },
  { key: 'users', label: 'Users & Creators', icon: IconUsers },
  {
    key: 'moderation',
    label: 'Moderation & Trust',
    icon: IconModeration,
    sub: leaves([
      ['moderation-reported', 'Reported content'],
      ['moderation-business', 'Business accounts'],
    ]),
  },
  {
    key: 'catalog',
    label: 'Categories',
    icon: IconCatalog,
    sub: leaves([
      ['catalog-categories', 'All categories'],
      ['catalog-requests', 'Category requests'],
    ]),
  },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: IconAnalytics,
    sub: leaves([
      ['analytics-map', 'World map'],
      ['analytics-country', 'Sales by location'],
      ['analytics-searched', 'Top searched destinations'],
    ]),
  },
  {
    key: 'subscriptions',
    label: 'Subscriptions',
    icon: IconSubscriptions,
    sub: leaves([
      ['subscriptions-overview', 'Overview'],
      ['subscriptions-plans', 'Plans'],
    ]),
  },
  { key: 'bookings', label: 'Bookings', icon: IconBookings },
  {
    key: 'finance',
    label: 'Finance',
    icon: IconFinance,
    sub: leaves([
      ['finance-revenue', 'Revenue'],
      ['finance-commissions', 'Commissions'],
    ]),
  },
  {
    key: 'system',
    label: 'System',
    icon: IconSystem,
    sub: leaves([
      ['system-admins', 'Administrators'],
      ['system-roles', 'Roles'],
      ['system-permissions', 'Permissions'],
      ['system-integrations', 'Integrations'],
      ['system-terms', 'Terms & privacy'],
    ]),
  },
];

export function labelForKey(key: string): string {
  for (const g of NAV) {
    if (g.key === key) return g.label;
    if (g.sub) {
      const leaf = g.sub.find((s) => s.key === key);
      if (leaf) return leaf.label;
    }
  }
  return 'Overview';
}

export function parentOfKey(key: string): NavGroup | undefined {
  return NAV.find((g) => g.sub?.some((s) => s.key === key));
}

export function navHref(key: string): string {
  return key === 'dashboard' ? '/dashboard' : `/${key.replace(/-/g, '/')}`;
}

// Inverse of navHref: derives a NAV key from the current pathname.
export function keyFromPathname(pathname: string): string {
  if (pathname === '/dashboard') return 'dashboard';
  const key = pathname.replace(/^\//, '').replace(/\//g, '-');
  return key || 'dashboard';
}

// i18n key for a NAV key's label, e.g. 'finance-payouts' -> 'admin.nav.financePayouts'.
// Sidebar/Header call t(navI18nKey(key), { defaultValue: labelForKey(key) }) — this
// keeps every visible NAV string going through react-i18next (translators can add a
// real translation for any of these 45 keys at any time) without requiring all three
// locale files to carry translations for screens Phase 1 doesn't build yet; the
// defaultValue is always the literal source label, so the rendered text is identical
// to the reference until a translation is added.
export function navI18nKey(key: string): string {
  const camel = key.replace(/-([a-z0-9])/g, (_m, ch: string) => ch.toUpperCase());
  return `admin.nav.${camel}`;
}
