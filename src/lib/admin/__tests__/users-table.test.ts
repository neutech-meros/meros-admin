import type { UserRecord } from '@/lib/mocks/admin/users';

import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  filterAndSortUsers,
  isAnyFilterActive,
} from '../users-table';

function user(overrides: Partial<UserRecord>): UserRecord {
  return {
    id: 'x',
    name: 'Test User',
    email: 'test@mail.com',
    phone: '',
    location: '',
    bio: '',
    account: 'Personal',
    plan: 'Freemium',
    followers: '100',
    following: '0',
    joined: '01/01/2025',
    status: 'Active',
    type: 'User',
    initials: 'TU',
    avatarColor: '#000',
    ...overrides,
  };
}

describe('filterAndSortUsers', () => {
  const users = [
    user({
      id: 'a',
      name: 'Alice Andrade',
      email: 'alice@mail.com',
      account: 'Personal',
      plan: 'Freemium',
      followers: '1.5k',
      joined: '10/01/2025',
      status: 'Active',
    }),
    user({
      id: 'b',
      name: 'Bruno Barros',
      email: 'bruno@mail.com',
      account: 'Business',
      plan: 'Premium',
      followers: '48.3k',
      joined: '05/06/2025',
      status: 'Deactivated',
    }),
    user({
      id: 'c',
      name: 'Carla Costa',
      email: 'carla@mail.com',
      account: 'Personal',
      plan: 'Free trial',
      followers: '90',
      joined: '20/03/2025',
      status: 'Active',
    }),
  ];

  it('returns everything with default filters and no sort', () => {
    expect(filterAndSortUsers(users, DEFAULT_FILTERS, DEFAULT_SORT)).toHaveLength(3);
  });

  it('filters by search across name and email', () => {
    const result = filterAndSortUsers(users, { ...DEFAULT_FILTERS, query: 'bruno' }, DEFAULT_SORT);
    expect(result.map((u) => u.id)).toEqual(['b']);
  });

  it('filters by account and plan and status together (AND, not OR)', () => {
    const result = filterAndSortUsers(
      users,
      { ...DEFAULT_FILTERS, account: 'Personal', status: 'Active' },
      DEFAULT_SORT,
    );
    expect(result.map((u) => u.id).sort()).toEqual(['a', 'c']);
  });

  it('sorts by followers descending, parsing k-suffixed values', () => {
    const result = filterAndSortUsers(users, DEFAULT_FILTERS, { key: 'followers', dir: 'desc' });
    expect(result.map((u) => u.id)).toEqual(['b', 'a', 'c']);
  });

  it('sorts by followers ascending', () => {
    const result = filterAndSortUsers(users, DEFAULT_FILTERS, { key: 'followers', dir: 'asc' });
    expect(result.map((u) => u.id)).toEqual(['c', 'a', 'b']);
  });

  it('sorts by plan using the rank order Premium > Free trial > Freemium', () => {
    const result = filterAndSortUsers(users, DEFAULT_FILTERS, { key: 'plan', dir: 'desc' });
    expect(result.map((u) => u.id)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by joined date', () => {
    const result = filterAndSortUsers(users, DEFAULT_FILTERS, { key: 'joined', dir: 'asc' });
    expect(result.map((u) => u.id)).toEqual(['a', 'c', 'b']);
  });

  it('sorts by name case-insensitively', () => {
    const result = filterAndSortUsers(users, DEFAULT_FILTERS, { key: 'name', dir: 'asc' });
    expect(result.map((u) => u.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('isAnyFilterActive', () => {
  it('is false for the default filters and sort', () => {
    expect(isAnyFilterActive(DEFAULT_FILTERS, DEFAULT_SORT)).toBe(false);
  });
  it('is true when search is set', () => {
    expect(isAnyFilterActive({ ...DEFAULT_FILTERS, query: 'x' }, DEFAULT_SORT)).toBe(true);
  });
  it('is true when a filter is non-default', () => {
    expect(isAnyFilterActive({ ...DEFAULT_FILTERS, account: 'Business' }, DEFAULT_SORT)).toBe(true);
  });
  it('is true when a sort is active', () => {
    expect(isAnyFilterActive(DEFAULT_FILTERS, { key: 'name', dir: 'asc' })).toBe(true);
  });
});
