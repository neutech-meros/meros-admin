import type { CategoryRequestScreenStatus } from '@/lib/admin/category-requests-api';

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
