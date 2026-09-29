import type { CategoryRequest } from '@/lib/mocks/admin/category-requests';

import { countByStatus, filterByTab, requestStatusTone } from '../category-requests';

function request(overrides: Partial<CategoryRequest> = {}): CategoryRequest {
  return {
    id: 'id',
    name: 'Name',
    parent: 'Parent',
    level: 'Subcategory',
    requester: 'Requester',
    handle: '@requester',
    role: 'Creator',
    date: '01/01/2026',
    votes: 1,
    status: 'Pending',
    why: 'Why',
    similar: 'Similar',
    initials: 'RQ',
    avatarColor: '#000',
    ...overrides,
  };
}

function requests(): CategoryRequest[] {
  return [
    request({ id: 'a', status: 'Pending' }),
    request({ id: 'b', status: 'Pending' }),
    request({ id: 'c', status: 'More info' }),
    request({ id: 'd', status: 'Approved' }),
    request({ id: 'e', status: 'Rejected' }),
  ];
}

describe('filterByTab', () => {
  it('filters to a single status', () => {
    expect(filterByTab(requests(), 'Pending').map((r) => r.id)).toEqual(['a', 'b']);
    expect(filterByTab(requests(), 'More info').map((r) => r.id)).toEqual(['c']);
    expect(filterByTab(requests(), 'Approved').map((r) => r.id)).toEqual(['d']);
    expect(filterByTab(requests(), 'Rejected').map((r) => r.id)).toEqual(['e']);
  });

  it('returns everything for "all"', () => {
    expect(filterByTab(requests(), 'all')).toHaveLength(5);
  });

  it('returns an empty array when nothing matches the tab', () => {
    expect(filterByTab([request({ status: 'Approved' })], 'Pending')).toEqual([]);
  });
});

describe('countByStatus', () => {
  it('counts each status independently of the others', () => {
    const list = requests();
    expect(countByStatus(list, 'Pending')).toBe(2);
    expect(countByStatus(list, 'More info')).toBe(1);
    expect(countByStatus(list, 'Approved')).toBe(1);
    expect(countByStatus(list, 'Rejected')).toBe(1);
  });

  it('returns 0 for a status with no matches', () => {
    expect(countByStatus([request({ status: 'Pending' })], 'Rejected')).toBe(0);
  });
});

describe('requestStatusTone', () => {
  it('maps every status to a distinct tone', () => {
    const pending = requestStatusTone('Pending');
    const moreInfo = requestStatusTone('More info');
    const approved = requestStatusTone('Approved');
    const rejected = requestStatusTone('Rejected');

    expect(pending).toEqual({ color: 'var(--warning)', background: 'var(--warning-bg)' });
    expect(approved).toEqual({ color: 'var(--success)', background: 'var(--success-bg)' });
    expect(rejected).toEqual({ color: 'var(--danger)', background: 'var(--danger-bg)' });
    expect(moreInfo).toEqual({ color: 'var(--brand-600)', background: 'var(--brand-100)' });

    const all = [pending, moreInfo, approved, rejected];
    const uniqueColors = new Set(all.map((tone) => tone.color));
    expect(uniqueColors.size).toBe(4);
  });
});
