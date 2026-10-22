import type { CategoryRequestScreenStatus } from '@/lib/admin/category-requests-api';
import type { CategoryNode } from '@/lib/mocks/admin/categories';

export const STATUS_LABEL_KEY: Record<CategoryRequestScreenStatus, string> = {
  Pending: 'admin.categoryRequests.status.pending',
  Approved: 'admin.categoryRequests.status.approved',
  Rejected: 'admin.categoryRequests.status.rejected',
};

export type CategoryRequestLevel = 'Parent' | 'Subcategory' | 'Child category';

export const LEVEL_LABEL_KEY: Record<CategoryRequestLevel, string> = {
  Parent: 'admin.categoryRequests.createModal.levelParent',
  Subcategory: 'admin.categoryRequests.createModal.levelSubcategory',
  'Child category': 'admin.categoryRequests.createModal.levelChildCategory',
};

export function requestStatusTone(status: CategoryRequestScreenStatus): {
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
  }
}

export function requesterInitials(requester: string): string {
  return requester
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .filter((initial) => /[\p{L}\p{N}]/u.test(initial))
    .join('');
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
