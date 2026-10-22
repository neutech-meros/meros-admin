import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getProxyEnv, isProxyEnabled } from '@/lib/server/proxy-env';

const UPSTREAM_ERROR_MESSAGE = 'Failed to reach the category requests API';
const PROXY_DISABLED_MESSAGE = 'This endpoint is disabled';

const categoryRequestStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

// Mirrors the upstream's adminCategoryRequestsQuerySchema bounds so an invalid query is
// rejected here with a 400 instead of round-tripping to the API and coming back as a 502.
// Defaults are left to the upstream.
const listQuerySchema = z.object({
  status: categoryRequestStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const categoryRequestSchema = z.object({
  id: z.string(),
  suggestedName: z.string(),
  status: categoryRequestStatusSchema,
  level: z.enum(['GROUP', 'CATEGORY', 'SUBCATEGORY']).nullable(),
  createdAt: z.string().datetime({ offset: true }),
  submitter: z.object({
    id: z.string(),
    nickname: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }),
  // Optional until meros-app PR #357 is on dev. decidedBy is deliberately not declared:
  // it echoes MEROS_ADMIN_ACTOR, which must never reach the browser.
  reason: z.string().nullable().optional(),
  decidedAt: z.string().datetime({ offset: true }).nullable().optional(),
  groupId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
});

const listResponseSchema = z.object({
  items: z.array(categoryRequestSchema),
  total: z.number().int().nonnegative(),
});

function upstreamFailure() {
  return NextResponse.json({ error: UPSTREAM_ERROR_MESSAGE }, { status: 502 });
}

export async function GET(request: Request) {
  try {
    if (!isProxyEnabled('ADMIN_CATEGORIES_PROXY_ENABLED')) {
      return NextResponse.json({ error: PROXY_DISABLED_MESSAGE }, { status: 404 });
    }
    const { MEROS_API_URL, MEROS_ADMIN_API_KEY } = getProxyEnv();

    const params = new URL(request.url).searchParams;
    const parsedQuery = listQuerySchema.safeParse({
      status: params.get('status') ?? undefined,
      page: params.get('page') ?? undefined,
      limit: params.get('limit') ?? undefined,
    });
    if (!parsedQuery.success) {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
    }
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(parsedQuery.data)) {
      if (value !== undefined) query.set(key, String(value));
    }
    const search = query.size > 0 ? `?${query}` : '';

    const upstream = await fetch(`${MEROS_API_URL}/admin/category-requests${search}`, {
      headers: { Authorization: `Bearer ${MEROS_ADMIN_API_KEY}` },
      cache: 'no-store',
    });
    if (!upstream.ok) {
      console.error(`[admin/category-requests] upstream responded with status ${upstream.status}`);
      return upstreamFailure();
    }
    const parsed = listResponseSchema.safeParse(await upstream.json());
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')} (${issue.code})`);
      console.error(
        `[admin/category-requests] upstream response failed validation: ${issues.join(', ')}`,
      );
      return upstreamFailure();
    }
    return NextResponse.json(parsed.data);
  } catch (error) {
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error';
    console.error(`[admin/category-requests] upstream request failed: ${reason}`);
    return upstreamFailure();
  }
}
