import type { CategoryNode } from '@/lib/mocks/admin/categories';
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

const PATH_SEPARATOR = ' › ';

export interface MatchedParentPath {
  parentSlug: string | null;
  subcategorySlug: string | null;
}

// Matches a request's proposed parent path (e.g. "Food › Restaurant") against the real
// category tree by name, to preselect where a request would land if approved.
export function matchParentPath(tree: CategoryNode[], parentPath: string): MatchedParentPath {
  const [topName, subName] = parentPath.split(PATH_SEPARATOR).map((part) => part.trim());
  const top = tree.find((node) => node.name === topName);
  if (!top) return { parentSlug: null, subcategorySlug: null };
  if (!subName) return { parentSlug: top.slug, subcategorySlug: null };
  const sub = (top.children ?? []).find((node) => node.name === subName);
  return { parentSlug: top.slug, subcategorySlug: sub?.slug ?? null };
}
