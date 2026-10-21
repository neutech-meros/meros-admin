import { z } from 'zod';

import { avatarColorForIndex, initialsOf } from '@/lib/mocks/admin/avatar';
import type { UserRecord } from '@/lib/mocks/admin/users';

export const planBucketSchema = z.enum(['FREEMIUM', 'PREMIUM', 'FREE_TRIAL']);

export const domainAccountRowSchema = z.object({
  id: z.string(),
  profileId: z.string().nullable(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  accountType: z.enum(['INDIVIDUAL', 'BUSINESS']).nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED']),
  createdAt: z.string().datetime({ offset: true }),
  planBucket: planBucketSchema.nullable(),
  followerCount: z.number().int().nonnegative().nullable(),
});

export const accountsResponseSchema = z.object({
  items: z.array(domainAccountRowSchema),
  total: z.number().int().nonnegative(),
});

export type PlanBucket = z.infer<typeof planBucketSchema>;
export type DomainAccountRow = z.infer<typeof domainAccountRowSchema>;
export type AccountsResponse = z.infer<typeof accountsResponseSchema>;

export const UNKNOWN_VALUE = '—';

const STATUS_MAP: Record<DomainAccountRow['status'], UserRecord['status']> = {
  ACTIVE: 'Active',
  INACTIVE: 'Deactivated',
  SUSPENDED: 'Suspended',
  DELETED: 'Deleted',
};

const PLAN_MAP: Record<PlanBucket, NonNullable<UserRecord['plan']>> = {
  FREEMIUM: 'Freemium',
  PREMIUM: 'Premium',
  FREE_TRIAL: 'Free trial',
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
    plan: account.planBucket === null ? null : PLAN_MAP[account.planBucket],
    followers: account.followerCount === null ? UNKNOWN_VALUE : String(account.followerCount),
    following: UNKNOWN_VALUE,
    joined: formatLocalDayMonthYear(new Date(account.createdAt)),
    createdAtIso: account.createdAt,
    status: STATUS_MAP[account.status],
    type: isBusiness ? 'Creator' : 'User',
    initials: initialsOf(name),
    avatarColor: avatarColorForIndex(index),
  };
}
