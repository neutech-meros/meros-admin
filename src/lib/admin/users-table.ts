import type { UserRecord } from '@/lib/mocks/admin/users';

export interface UserFilters {
  query: string;
  account: 'all' | UserRecord['account'];
  plan: 'all' | UserRecord['plan'];
  status: 'all' | UserRecord['status'];
}

export const DEFAULT_FILTERS: UserFilters = {
  query: '',
  account: 'all',
  plan: 'all',
  status: 'all',
};

export const STATUS_LABEL_KEY: Record<UserRecord['status'], string> = {
  Active: 'admin.users.statusOptions.active',
  Deactivated: 'admin.users.statusOptions.deactivated',
  Deleted: 'admin.users.statusOptions.deleted',
};

export const ROLE_LABEL_KEY: Record<UserRecord['type'], string> = {
  User: 'admin.users.roleOptions.user',
  Creator: 'admin.users.roleOptions.creator',
};

export type SortKey = 'name' | 'account' | 'plan' | 'followers' | 'joined' | 'status';
export type SortDir = 'asc' | 'desc';

export interface SortState {
  key: SortKey | null;
  dir: SortDir;
}

export const DEFAULT_SORT: SortState = { key: null, dir: 'desc' };

export const SORT_COLUMNS: Array<{ key: SortKey; defaultDir: SortDir }> = [
  { key: 'name', defaultDir: 'asc' },
  { key: 'account', defaultDir: 'asc' },
  { key: 'plan', defaultDir: 'desc' },
  { key: 'followers', defaultDir: 'desc' },
  { key: 'joined', defaultDir: 'desc' },
  { key: 'status', defaultDir: 'asc' },
];

const PLAN_RANK: Record<UserRecord['plan'], number> = {
  Premium: 3,
  'Free trial': 2,
  Freemium: 1,
};

function followersNum(s: string): number {
  const t = s.trim().toLowerCase();
  const n = parseFloat(t) || 0;
  if (t.endsWith('m')) return n * 1e6;
  if (t.endsWith('k')) return n * 1e3;
  return n;
}

function parseJoinedDate(s: string): number {
  const [day, month, year] = s.split('/').map(Number);
  if (!day || !month || !year) return 0;
  return new Date(year, month - 1, day).getTime();
}

function sortValue(user: UserRecord, key: SortKey): number | string {
  switch (key) {
    case 'followers':
      return followersNum(user.followers);
    case 'plan':
      return PLAN_RANK[user.plan] ?? 0;
    case 'joined':
      return parseJoinedDate(user.joined);
    case 'account':
      return user.account.toLowerCase();
    default:
      return String(user[key] ?? '').toLowerCase();
  }
}

export function filterAndSortUsers(
  users: UserRecord[],
  filters: UserFilters,
  sort: SortState,
): UserRecord[] {
  const q = filters.query.trim().toLowerCase();
  const filtered = users.filter(
    (u) =>
      (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (filters.account === 'all' || u.account === filters.account) &&
      (filters.plan === 'all' || u.plan === filters.plan) &&
      (filters.status === 'all' || u.status === filters.status),
  );

  if (!sort.key) return filtered;

  const key = sort.key;
  const mul = sort.dir === 'asc' ? 1 : -1;
  return [...filtered].sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    if (va < vb) return -mul;
    if (va > vb) return mul;
    return 0;
  });
}

export function isAnyFilterActive(filters: UserFilters, sort: SortState): boolean {
  return (
    filters.query !== DEFAULT_FILTERS.query ||
    filters.account !== DEFAULT_FILTERS.account ||
    filters.plan !== DEFAULT_FILTERS.plan ||
    filters.status !== DEFAULT_FILTERS.status ||
    sort.key !== null
  );
}
