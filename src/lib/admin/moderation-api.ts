import { z } from 'zod';

import type {
  ReportDecision,
  ReportedItem,
  ReportSeverity,
  ReviewedItem,
} from '@/lib/mocks/admin/moderation';

// Validates the same-origin proxy's response — this app's own trust boundary, mirroring
// how every other admin proxy in this codebase re-validates rather than trusting the
// network response's shape blindly.

const targetTypeSchema = z.enum(['LIST', 'PLACE_IN_LIST', 'PROFILE']);
const severitySchema = z.enum(['HIGH', 'AVERAGE', 'LOW']);
const decisionSchema = z.enum(['KEPT', 'REMOVED']);

const reporterSchema = z.object({
  name: z.string(),
  handle: z.string().nullable(),
  reason: z.string(),
  reportedAt: z.string(),
});

const queueItemSchema = z.object({
  id: z.string(),
  targetType: targetTypeSchema,
  targetId: z.string(),
  title: z.string(),
  kind: z.string(),
  excerpt: z.string().nullable(),
  where: z.string().nullable(),
  reason: z.string(),
  severity: severitySchema,
  owner: z
    .object({
      name: z.string(),
      handle: z.string().nullable(),
      account: z.string(),
      accountStatus: z.string(),
    })
    .nullable(),
  priorAction: z.string(),
  reporters: z.array(reporterSchema),
});

export const queueResponseSchema = z.object({
  items: z.array(queueItemSchema),
  total: z.number(),
});

const reviewedItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  owner: z.string(),
  reportsLabel: z.string(),
  decision: decisionSchema,
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string(),
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

// The API returns the account type ('Business'/'Individual') and the raw account status
// (e.g. 'ACTIVE') as-is — it has no "Creator · Verified"/"Traveler" style label, since
// those concepts (creator status, verification) live in the Users & Creators screen's own
// data model, not in the moderation API. Shown as-is rather than invented; see MER-795's
// spec for the full note on this mismatch.
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
    kind: raw.kind,
    reason: raw.reason,
    severity: SEVERITY_LABEL[raw.severity],
    excerpt: raw.excerpt,
    where: raw.where ?? '—',
    owner: ownerName,
    handle: raw.owner?.handle ?? '',
    account: raw.owner?.account ?? '—',
    accountStatus: raw.owner?.accountStatus ?? '—',
    priorAction: raw.priorAction,
    reporters: raw.reporters.map((r) => ({
      name: r.name,
      handle: r.handle ?? '',
      reason: r.reason,
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
    reportsLabel: raw.reportsLabel,
    decision: DECISION_LABEL[raw.decision],
    reviewedBy: raw.reviewedBy ?? '—',
    reviewedAt: formatDateTime(raw.reviewedAt),
  };
}
