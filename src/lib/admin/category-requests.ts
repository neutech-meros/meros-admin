import type { CategoryRequest, CategoryRequestStatus } from '@/lib/mocks/admin/category-requests';

export const TAB_KEYS: Array<CategoryRequestStatus | 'all'> = [
  'Pending',
  'More info',
  'Approved',
  'Rejected',
  'all',
];

export function filterByTab(
  requests: CategoryRequest[],
  tab: CategoryRequestStatus | 'all',
): CategoryRequest[] {
  return tab === 'all' ? requests : requests.filter((request) => request.status === tab);
}

export function countByStatus(requests: CategoryRequest[], status: CategoryRequestStatus): number {
  return requests.filter((request) => request.status === status).length;
}

export const STATUS_LABEL_KEY: Record<CategoryRequestStatus, string> = {
  Pending: 'admin.categoryRequests.status.pending',
  'More info': 'admin.categoryRequests.status.moreInfo',
  Approved: 'admin.categoryRequests.status.approved',
  Rejected: 'admin.categoryRequests.status.rejected',
};

export function requestStatusTone(status: CategoryRequestStatus): {
  color: string;
  background: string;
} {
  switch (status) {
    case 'Pending':
      return { color: 'var(--warning)', background: 'var(--warning-bg)' };
    case 'Approved':
      return { color: 'var(--success)', background: 'var(--success-bg)' };
    case 'Rejected':
      return { color: 'var(--danger)', background: 'var(--danger-bg)' };
    case 'More info':
      return { color: 'var(--brand-600)', background: 'var(--brand-100)' };
  }
}
