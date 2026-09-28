import { z } from 'zod';

import type {
  BusinessAccountRequest,
  BusinessAccountRequestStatus,
} from '@/lib/mocks/admin/businessAccounts';

// Validates the same-origin proxy's response — this app's own trust boundary, mirroring
// how every other admin proxy in this codebase re-validates rather than trusting the
// network response's shape blindly.

const statusSchema = z.enum(['Pending', 'More info', 'Approved', 'Rejected']);

const businessAccountItemSchema = z.object({
  id: z.string().uuid(),
  businessName: z.string().nullable(),
  requesterName: z.string(),
  requesterEmail: z.string().nullable(),
  city: z.string().nullable(),
  taxId: z.string().nullable(),
  category: z.string().nullable(),
  requestedPlan: z.string().nullable(),
  documentsSubmitted: z.number(),
  documentsRequired: z.number(),
  applicationNote: z.string().nullable(),
  status: statusSchema,
  submittedAt: z.string().datetime({ offset: true }),
});

export const businessAccountListResponseSchema = z.object({
  items: z.array(businessAccountItemSchema),
});

export type BusinessAccountApiItem = z.infer<typeof businessAccountItemSchema>;

const EMPTY = '—';
const AVATAR_COLORS = ['#7F00FF', '#1A8245', '#7C5CDF', '#B7791F', '#DF2339'];

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

// The API sends only real, structured fields (no display prose) — this maps them onto the
// same BusinessAccountRequest shape the page/drawer already render, computing the two purely
// presentational fields (initials/avatarColor) client-side, same as this app's other screens.
export function toBusinessAccountRequest(
  raw: BusinessAccountApiItem,
  index: number,
  formatDateTime: (iso: string) => string,
): BusinessAccountRequest {
  const name = raw.businessName ?? EMPTY;
  return {
    id: raw.id,
    name,
    city: raw.city ?? EMPTY,
    cnpj: raw.taxId ?? EMPTY,
    category: raw.category ?? EMPTY,
    requester: raw.requesterName,
    email: raw.requesterEmail ?? EMPTY,
    docs: `${raw.documentsSubmitted} of ${raw.documentsRequired}`,
    submitted: formatDateTime(raw.submittedAt),
    status: raw.status as BusinessAccountRequestStatus,
    plan: raw.requestedPlan ?? EMPTY,
    note: raw.applicationNote ?? EMPTY,
    initials: initialsOf(name),
    avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
  };
}

export class BusinessAccountApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'BusinessAccountApiError';
  }
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

export async function fetchBusinessAccountRequests(
  formatDateTime: (iso: string) => string,
): Promise<BusinessAccountRequest[]> {
  const response = await fetch('/api/admin/business-accounts');
  if (!response.ok)
    throw new Error(`Business accounts request failed with status ${response.status}`);
  const { items } = businessAccountListResponseSchema.parse(await response.json());
  return items.map((raw, index) => toBusinessAccountRequest(raw, index, formatDateTime));
}

export async function requestBusinessAccountInfo(id: string): Promise<void> {
  const response = await fetch(`/api/admin/business-accounts/${id}/request-info`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new BusinessAccountApiError(
      response.status,
      await readErrorMessage(response, `Request failed with status ${response.status}`),
    );
  }
}

export async function approveBusinessAccount(id: string): Promise<void> {
  const response = await fetch(`/api/admin/business-accounts/${id}/approve`, { method: 'POST' });
  if (!response.ok) {
    throw new BusinessAccountApiError(
      response.status,
      await readErrorMessage(response, `Request failed with status ${response.status}`),
    );
  }
}

export async function rejectBusinessAccount(
  id: string,
  reason: string,
  note: string | null,
): Promise<void> {
  const response = await fetch(`/api/admin/business-accounts/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, note: note ?? undefined }),
  });
  if (!response.ok) {
    throw new BusinessAccountApiError(
      response.status,
      await readErrorMessage(response, `Request failed with status ${response.status}`),
    );
  }
}
