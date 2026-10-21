import { z } from 'zod';

import type { CategoryRequestLevel } from '@/lib/admin/category-requests';

const BASE_PATH = '/api/admin/category-requests';
const EMPTY = '—';

const apiStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
const apiLevelSchema = z.enum(['GROUP', 'CATEGORY', 'SUBCATEGORY']);

export type CategoryRequestApiStatus = z.infer<typeof apiStatusSchema>;
export type CategoryRequestApiLevel = z.infer<typeof apiLevelSchema>;

const categoryRequestItemSchema = z.object({
  id: z.string(),
  suggestedName: z.string(),
  status: apiStatusSchema,
  level: apiLevelSchema.nullable(),
  createdAt: z.string().datetime({ offset: true }),
  submitter: z.object({
    id: z.string(),
    nickname: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }),
  reason: z.string().nullable().optional(),
  decidedAt: z.string().datetime({ offset: true }).nullable().optional(),
  groupId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
});

const listResponseSchema = z.object({
  items: z.array(categoryRequestItemSchema),
  total: z.number().int().nonnegative(),
});

const approveResultSchema = z.object({
  id: z.string(),
  createdId: z.string(),
  level: apiLevelSchema,
  labelKey: z.string(),
});

const errorBodySchema = z.object({ code: z.string().optional() });

export type CategoryRequestApiItem = z.infer<typeof categoryRequestItemSchema>;
export type ApproveCategoryRequestResult = z.infer<typeof approveResultSchema>;

export type CategoryRequestScreenStatus = 'Pending' | 'Approved' | 'Rejected';

const STATUS: Record<CategoryRequestApiStatus, CategoryRequestScreenStatus> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const LEVEL: Record<CategoryRequestApiLevel, CategoryRequestLevel> = {
  GROUP: 'Parent',
  CATEGORY: 'Subcategory',
  SUBCATEGORY: 'Child category',
};

export interface CategoryRequestDecision {
  reason: string | null;
  decidedAt: string | null;
  groupId: string | null;
  categoryId: string | null;
}

export interface CategoryRequestItem {
  id: string;
  name: string;
  status: CategoryRequestScreenStatus;
  level: CategoryRequestLevel | null;
  requester: string;
  avatarUrl: string | null;
  date: string;
  decision: CategoryRequestDecision | null;
}

export function toCategoryRequestItem(
  raw: CategoryRequestApiItem,
  formatDate: (iso: string) => string,
): CategoryRequestItem {
  const decidedAt = raw.decidedAt ?? null;
  const reason = raw.reason ?? null;
  return {
    id: raw.id,
    name: raw.suggestedName,
    status: STATUS[raw.status],
    level: raw.level === null ? null : LEVEL[raw.level],
    requester: raw.submitter.nickname ?? EMPTY,
    avatarUrl: raw.submitter.avatarUrl,
    date: formatDate(raw.createdAt),
    decision:
      decidedAt === null && reason === null
        ? null
        : {
            reason,
            decidedAt: decidedAt === null ? null : formatDate(decidedAt),
            groupId: raw.groupId ?? null,
            categoryId: raw.categoryId ?? null,
          },
  };
}

export interface CategoryRequestListQuery {
  status?: CategoryRequestApiStatus;
  page?: number;
  limit?: number;
}

export type CategoryRequestListResult =
  { ok: true; items: CategoryRequestItem[]; total: number } | { ok: false };

export type CategoryRequestTotalsResult =
  { ok: true; totals: { pending: number; approved: number; rejected: number } } | { ok: false };

export interface ApproveCategoryRequestPayload {
  level: CategoryRequestApiLevel;
  groupId?: string;
  categoryId?: string;
  iconKey?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export type ApproveOutcome =
  | { kind: 'ok'; result: ApproveCategoryRequestResult }
  | { kind: 'not-found' }
  | { kind: 'already-resolved' }
  | { kind: 'name-exists' }
  | { kind: 'error' };

export type RejectOutcome =
  { kind: 'ok' } | { kind: 'not-found' } | { kind: 'already-resolved' } | { kind: 'error' };

type Failure =
  | { kind: 'not-found' }
  | { kind: 'already-resolved' }
  | { kind: 'name-exists' }
  | { kind: 'error' };

async function loadList(query: CategoryRequestListQuery) {
  const params = new URLSearchParams();
  if (query.status !== undefined) params.set('status', query.status);
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  const queryString = params.toString();
  const search = queryString === '' ? '' : `?${queryString}`;
  const response = await fetch(`${BASE_PATH}${search}`);
  if (!response.ok) return null;
  const parsed = listResponseSchema.safeParse(await response.json());
  return parsed.success ? parsed.data : null;
}

export async function fetchCategoryRequests(
  query: CategoryRequestListQuery,
  formatDate: (iso: string) => string,
): Promise<CategoryRequestListResult> {
  try {
    const data = await loadList(query);
    if (data === null) return { ok: false };
    return {
      ok: true,
      items: data.items.map((raw) => toCategoryRequestItem(raw, formatDate)),
      total: data.total,
    };
  } catch {
    return { ok: false };
  }
}

export async function fetchCategoryRequestTotals(): Promise<CategoryRequestTotalsResult> {
  try {
    const [pending, approved, rejected] = await Promise.all(
      (['PENDING', 'APPROVED', 'REJECTED'] as const).map((status) =>
        loadList({ status, limit: 1 }),
      ),
    );
    if (pending === null || approved === null || rejected === null) return { ok: false };
    return {
      ok: true,
      totals: { pending: pending.total, approved: approved.total, rejected: rejected.total },
    };
  } catch {
    return { ok: false };
  }
}

async function postDecision(id: string, action: 'approve' | 'reject', body: object) {
  return fetch(`${BASE_PATH}/${encodeURIComponent(id)}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function toFailure(response: Response): Promise<Failure> {
  let code: string | undefined;
  try {
    code = errorBodySchema.parse(await response.json()).code;
  } catch {
    return { kind: 'error' };
  }
  if (response.status === 404 && code === 'CATEGORY_REQUEST_NOT_FOUND')
    return { kind: 'not-found' };
  if (response.status === 409 && code === 'CATEGORY_REQUEST_ALREADY_RESOLVED') {
    return { kind: 'already-resolved' };
  }
  if (response.status === 409 && code === 'CATEGORY_NAME_EXISTS') return { kind: 'name-exists' };
  return { kind: 'error' };
}

export async function approveCategoryRequest(
  id: string,
  payload: ApproveCategoryRequestPayload,
): Promise<ApproveOutcome> {
  try {
    const response = await postDecision(id, 'approve', payload);
    if (!response.ok) return await toFailure(response);
    const parsed = approveResultSchema.safeParse(await response.json());
    return parsed.success ? { kind: 'ok', result: parsed.data } : { kind: 'error' };
  } catch {
    return { kind: 'error' };
  }
}

export async function rejectCategoryRequest(id: string, reason?: string): Promise<RejectOutcome> {
  try {
    const response = await postDecision(id, 'reject', reason === undefined ? {} : { reason });
    if (response.ok) return { kind: 'ok' };
    const failure = await toFailure(response);
    return failure.kind === 'name-exists' ? { kind: 'error' } : failure;
  } catch {
    return { kind: 'error' };
  }
}
