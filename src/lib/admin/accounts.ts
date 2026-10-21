import { z } from 'zod';

import { avatarColorForIndex, initialsOf } from '@/lib/mocks/admin/avatar';
import type { UserRecord } from '@/lib/mocks/admin/users';

export const domainAccountRowSchema = z.object({
  id: z.string(),
  profileId: z.string().nullable(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  accountType: z.enum(['INDIVIDUAL', 'BUSINESS']).nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED']),
  createdAt: z.string().datetime({ offset: true }),
});

export const accountsResponseSchema = z.object({
  items: z.array(domainAccountRowSchema),
  total: z.number().int().nonnegative(),
});

export type DomainAccountRow = z.infer<typeof domainAccountRowSchema>;
export type AccountsResponse = z.infer<typeof accountsResponseSchema>;

export const UNKNOWN_VALUE = '—';

const STATUS_MAP: Record<DomainAccountRow['status'], UserRecord['status']> = {
  ACTIVE: 'Active',
  INACTIVE: 'Deactivated',
  SUSPENDED: 'Suspended',
  DELETED: 'Deleted',
};

function formatLocalDayMonthYear(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

export function toUserRecord(account: DomainAccountRow, index: number): UserRecord {
  const name = account.name ?? account.email ?? account.id;
  const isBusiness = account.accountType === 'BUSINESS';
  return {
    id: account.id,
    name,
    email: account.email ?? '',
    phone: account.phone ?? '',
    location: '',
    bio: '',
    account: isBusiness ? 'Business' : 'Personal',
    plan: null,
    followers: UNKNOWN_VALUE,
    following: UNKNOWN_VALUE,
    joined: formatLocalDayMonthYear(new Date(account.createdAt)),
    createdAtIso: account.createdAt,
    status: STATUS_MAP[account.status],
    type: isBusiness ? 'Creator' : 'User',
    initials: initialsOf(name),
    avatarColor: avatarColorForIndex(index),
  };
}
