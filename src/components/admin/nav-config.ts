import type { ComponentType } from 'react';

import {
  IconAnalytics,
  IconBookings,
  IconCampaigns,
  IconCatalog,
  IconDashboard,
  IconFinance,
  IconLists,
  IconModeration,
  IconMonitoring,
  IconSecurity,
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

export const NAV: NavGroup[] = [
  { key: 'dashboard', label: 'Overview', icon: IconDashboard },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: IconAnalytics,
    sub: leaves([
      ['analytics-country', 'Sales by location'],
      ['analytics-map', 'World map'],
      ['analytics-searched', 'Top searched destinations'],
      ['analytics-topsold', 'Top selling lists'],
      ['analytics-conversion', 'Conversion'],
      ['analytics-revenue', 'Revenue'],
    ]),
  },
  { key: 'lists', label: 'Travel Lists', icon: IconLists },
  { key: 'users', label: 'Users & Creators', icon: IconUsers },
  {
    key: 'subscriptions',
    label: 'Subscriptions',
    icon: IconSubscriptions,
    sub: leaves([
      ['subscriptions-overview', 'Overview'],
      ['subscriptions-plans', 'Plans'],
      ['subscriptions-features', 'Features'],
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
      ['finance-wallets', 'Seller wallets'],
      ['finance-split', 'Split'],
      ['finance-fees', 'Fees'],
      ['finance-apple', 'Apple'],
      ['finance-google', 'Google'],
      ['finance-stripe', 'Stripe'],
      ['finance-payouts', 'Payouts'],
      ['finance-refunds', 'Refunds'],
      ['finance-chargebacks', 'Chargebacks'],
      ['finance-statement', 'Statement'],
    ]),
  },
  {
    key: 'catalog',
    label: 'Catalog',
    icon: IconCatalog,
    sub: leaves([
      ['catalog-categories', 'Categories'],
      ['catalog-requests', 'Category requests'],
    ]),
  },
  { key: 'campaigns', label: 'Campaigns', icon: IconCampaigns },
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
    key: 'security',
    label: 'Security',
    icon: IconSecurity,
    sub: leaves([
      ['security-sessions', 'Sessions'],
      ['security-ips', 'IPs'],
      ['security-devices', 'Devices'],
      ['security-login', 'Login'],
      ['security-2fa', '2FA'],
      ['security-tokens', 'Tokens'],
      ['security-permissions', 'Permissions'],
      ['security-history', 'History'],
      ['security-map', 'Access map'],
      ['security-suspicious', 'Suspicious login'],
      ['security-alerts', 'Alerts'],
    ]),
  },
  { key: 'monitoring', label: 'Monitoring', icon: IconMonitoring },
  {
    key: 'system',
    label: 'System',
    icon: IconSystem,
    sub: leaves([
      ['system-admins', 'Administrators'],
      ['system-roles', 'Roles'],
      ['system-permissions', 'Permissions'],
      ['system-flags', 'Feature Flags'],
      ['system-settings', 'Settings'],
      ['system-integrations', 'Integrations'],
      ['system-logs', 'Logs'],
      ['system-audit', 'Audit Log'],
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
