import type { UserRecord } from '@/lib/mocks/admin/users';

import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  filterAndSortUsers,
  isAnyFilterActive,
  paginateUsers,
  USERS_PAGE_SIZE,
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

  describe('with a real account whose plan is unknown (null)', () => {
    const withUnknownPlan = [
      ...users,
      user({ id: 'r', name: 'Real Account', plan: null, followers: '—', following: '—' }),
    ];

    it('never matches a null-plan row when a specific plan is selected', () => {
      for (const plan of ['Premium', 'Free trial', 'Freemium'] as const) {
        const result = filterAndSortUsers(
          withUnknownPlan,
          { ...DEFAULT_FILTERS, plan },
          DEFAULT_SORT,
        );
        expect(result.map((u) => u.id)).not.toContain('r');
      }
    });

    it('keeps the null-plan row when the plan filter is "all"', () => {
      const result = filterAndSortUsers(withUnknownPlan, DEFAULT_FILTERS, DEFAULT_SORT);
      expect(result.map((u) => u.id)).toContain('r');
    });

    it('sorts a null plan below every known plan', () => {
      const desc = filterAndSortUsers(withUnknownPlan, DEFAULT_FILTERS, {
        key: 'plan',
        dir: 'desc',
      });
      expect(desc.map((u) => u.id)).toEqual(['b', 'c', 'a', 'r']);
      const asc = filterAndSortUsers(withUnknownPlan, DEFAULT_FILTERS, { key: 'plan', dir: 'asc' });
      expect(asc.map((u) => u.id)).toEqual(['r', 'a', 'c', 'b']);
    });

    it('sorts a "—" follower count as zero without crashing', () => {
      const result = filterAndSortUsers(withUnknownPlan, DEFAULT_FILTERS, {
        key: 'followers',
        dir: 'asc',
      });
      expect(result.map((u) => u.id)).toEqual(['r', 'c', 'a', 'b']);
    });
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

describe('paginateUsers', () => {
  const items = Array.from({ length: 20 }, (_, i) => i);

  it('uses a page size of 8 by default', () => {
    expect(USERS_PAGE_SIZE).toBe(8);
  });

  it('returns the first page by default slice', () => {
    const result = paginateUsers(items, 1);
    expect(result.pageItems).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(result).toMatchObject({ page: 1, pageCount: 3, startIndex: 0, endIndex: 8 });
  });

  it('returns a middle page', () => {
    const result = paginateUsers(items, 2);
    expect(result.pageItems).toEqual([8, 9, 10, 11, 12, 13, 14, 15]);
    expect(result).toMatchObject({ page: 2, pageCount: 3, startIndex: 8, endIndex: 16 });
  });

  it('returns a partial last page', () => {
    const result = paginateUsers(items, 3);
    expect(result.pageItems).toEqual([16, 17, 18, 19]);
    expect(result).toMatchObject({ page: 3, pageCount: 3, startIndex: 16, endIndex: 20 });
  });

  it('clamps a page beyond the last page down to the last page', () => {
    const result = paginateUsers(items, 99);
    expect(result.page).toBe(3);
    expect(result.pageItems).toEqual([16, 17, 18, 19]);
  });

  it('clamps a page below 1 up to 1', () => {
    const result = paginateUsers(items, 0);
    expect(result.page).toBe(1);
  });

  it('reports a single page of 1 for an empty list, with an empty slice', () => {
    const result = paginateUsers([], 1);
    expect(result).toMatchObject({
      pageItems: [],
      page: 1,
      pageCount: 1,
      startIndex: 0,
      endIndex: 0,
    });
  });

  it('reports a single page for a list at or under the page size', () => {
    const eight = Array.from({ length: 8 }, (_, i) => i);
    expect(paginateUsers(eight, 1).pageCount).toBe(1);
  });

  it('supports a custom page size', () => {
    const result = paginateUsers(items, 2, 5);
    expect(result.pageItems).toEqual([5, 6, 7, 8, 9]);
    expect(result.pageCount).toBe(4);
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
