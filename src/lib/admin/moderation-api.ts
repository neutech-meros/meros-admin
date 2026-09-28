import { z } from 'zod';

import type {
  ReportDecision,
  ReportedItem,
  ReportSeverity,
  ReviewedItem,
} from '@/lib/admin/moderation';

// Validates the same-origin proxy's response — this app's own trust boundary, mirroring
// how every other admin proxy in this codebase re-validates rather than trusting the
// network response's shape blindly.

const targetTypeSchema = z.enum(['LIST', 'PLACE_IN_LIST', 'PROFILE']);
const severitySchema = z.enum(['HIGH', 'AVERAGE', 'LOW']);
const decisionSchema = z.enum(['KEPT', 'REMOVED']);
const accountStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED']);
const accountTypeSchema = z.enum(['INDIVIDUAL', 'BUSINESS']);

const reporterSchema = z.object({
  name: z.string(),
  handle: z.string().nullable(),
  reason: z.string(),
  details: z.string().nullable(),
  reportedAt: z.string().datetime({ offset: true }),
});

const queueItemSchema = z.object({
  id: z.string(),
  targetType: targetTypeSchema,
  targetId: z.string(),
  title: z.string(),
  excerpt: z.string().nullable(),
  itemCount: z.number().nullable(),
  publishedAt: z.string().datetime({ offset: true }).nullable(),
  listTitle: z.string().nullable(),
  venueCity: z.string().nullable(),
  venueCountry: z.string().nullable(),
  bio: z.string().nullable(),
  profileCreatedAt: z.string().datetime({ offset: true }).nullable(),
  reason: z.string(),
  severity: severitySchema,
  owner: z
    .object({
      name: z.string(),
      handle: z.string().nullable(),
      accountType: accountTypeSchema,
      accountStatus: accountStatusSchema,
    })
    .nullable(),
  priorRemovals: z.number(),
  reporters: z.array(reporterSchema),
});

export const queueResponseSchema = z.object({
  items: z.array(queueItemSchema),
  total: z.number(),
});

const reviewedItemSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  owner: z.string().nullable(),
  reportCount: z.number(),
  decision: decisionSchema,
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().datetime({ offset: true }),
});

export const reviewedResponseSchema = z.object({
  items: z.array(reviewedItemSchema),
});

export type QueueItem = z.infer<typeof queueItemSchema>;
export type ReviewedApiItem = z.infer<typeof reviewedItemSchema>;

const AVATAR_COLORS = ['#7F00FF', '#1A8245', '#7C5CDF', '#B7791F', '#DF2339'];

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

const SEVERITY_LABEL: Record<z.infer<typeof severitySchema>, ReportSeverity> = {
  HIGH: 'High',
  AVERAGE: 'Average',
  LOW: 'Low',
};

const DECISION_LABEL: Record<z.infer<typeof decisionSchema>, ReportDecision> = {
  KEPT: 'Kept',
  REMOVED: 'Removed',
};

// The API sends only structured, non-prose fields (raw account type/status enums, a reason
// code, and per-target-kind data like itemCount/venueCity/bio) — no pre-composed English
// text. Translation and composition into a "where it lives" summary happen entirely in the
// UI layer (moderation-labels.ts, ReportDetailDrawer) so every locale renders correctly, not
// just English. See MER-795's spec for the full history of this contract.
export function toReportedItem(
  raw: QueueItem,
  index: number,
  formatDateTime: (iso: string) => string,
): ReportedItem {
  const ownerName = raw.owner?.name ?? '—';
  return {
    id: raw.id,
    targetType: raw.targetType,
    targetId: raw.targetId,
    title: raw.title,
    reason: raw.reason,
    severity: SEVERITY_LABEL[raw.severity],
    excerpt: raw.excerpt,
    itemCount: raw.itemCount,
    publishedAt: raw.publishedAt ? formatDateTime(raw.publishedAt) : null,
    listTitle: raw.listTitle,
    venueCity: raw.venueCity,
    venueCountry: raw.venueCountry,
    bio: raw.bio,
    profileCreatedAt: raw.profileCreatedAt ? formatDateTime(raw.profileCreatedAt) : null,
    owner: ownerName,
    handle: raw.owner?.handle ?? '',
    accountType: raw.owner?.accountType ?? null,
    accountStatus: raw.owner?.accountStatus ?? null,
    priorRemovals: raw.priorRemovals,
    reporters: raw.reporters.map((r) => ({
      name: r.name,
      handle: r.handle ?? '',
      reason: r.reason,
      details: r.details,
      date: formatDateTime(r.reportedAt),
    })),
    initials: initialsOf(ownerName),
    avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
  };
}

export function toReviewedItem(
  raw: ReviewedApiItem,
  formatDateTime: (iso: string) => string,
): ReviewedItem {
  return {
    id: raw.id,
    title: raw.title,
    owner: raw.owner,
    reportCount: raw.reportCount,
    decision: DECISION_LABEL[raw.decision],
    reviewedBy: raw.reviewedBy ?? '—',
    reviewedAt: formatDateTime(raw.reviewedAt),
  };
}
