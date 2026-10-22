import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getProxyEnv, isProxyEnabled } from '@/lib/server/proxy-env';

const UPSTREAM_ERROR_MESSAGE = 'Failed to reach the category requests API';
const PROXY_DISABLED_MESSAGE = 'This endpoint is disabled';

const levelSchema = z.enum(['GROUP', 'CATEGORY', 'SUBCATEGORY']);

const paramsSchema = z.object({ id: z.string().uuid() });
// Mirrors the upstream categoryRequestApprovePayloadSchema minus actorLabel, which is
// always set from the server env so a client can never choose who the approval is
// attributed to.
const bodySchema = z
  .object({
    level: levelSchema,
    groupId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    iconKey: z.string().min(1).max(50).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  })
  .refine((body) => body.level !== 'CATEGORY' || body.groupId !== undefined, {
    path: ['groupId'],
  })
  .refine((body) => body.level !== 'SUBCATEGORY' || body.categoryId !== undefined, {
    path: ['categoryId'],
  });

const approveResponseSchema = z.object({
  id: z.string(),
  createdId: z.string(),
  level: levelSchema,
  labelKey: z.string(),
});

// The screen picks its message from this code (two different 409s), so only the known
// set is forwarded and the upstream's translated message never is.
const upstreamErrorSchema = z.object({
  code: z
    .enum([
      'CATEGORY_REQUEST_NOT_FOUND',
      'CATEGORY_REQUEST_ALREADY_RESOLVED',
      'CATEGORY_NAME_EXISTS',
      'MISSING_GROUP_ID',
      'MISSING_CATEGORY_ID',
      'INVALID_PAYLOAD',
      'VALIDATION_ERROR',
      'UNKNOWN',
    ])
    .catch('UNKNOWN'),
});

const PASSED_THROUGH_ERRORS: Record<number, string> = {
  400: 'Invalid approval payload',
  404: 'Category request not found',
  409: 'This category request cannot be approved',
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function upstreamErrorCode(upstream: Response) {
  try {
    return upstreamErrorSchema.parse(await upstream.json()).code;
  } catch {
    return 'UNKNOWN';
  }
}

function upstreamFailure() {
  return NextResponse.json({ error: UPSTREAM_ERROR_MESSAGE }, { status: 502 });
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    if (!isProxyEnabled('ADMIN_CATEGORIES_PROXY_ENABLED')) {
      return NextResponse.json({ error: PROXY_DISABLED_MESSAGE }, { status: 404 });
    }

    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json({ error: 'Invalid category request id' }, { status: 400 });
    }

    // Cheap CSRF hardening until real admin auth lands, same as every other admin proxy
    // POST: a cross-site form POST cannot send application/json.
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const parsedBody = bodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json({ error: PASSED_THROUGH_ERRORS[400] }, { status: 400 });
    }

    const { MEROS_API_URL, MEROS_ADMIN_API_KEY, MEROS_ADMIN_ACTOR } = getProxyEnv();
    const upstream = await fetch(
      `${MEROS_API_URL}/admin/category-requests/${encodeURIComponent(parsedParams.data.id)}/approve`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${MEROS_ADMIN_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...parsedBody.data, actorLabel: MEROS_ADMIN_ACTOR }),
        cache: 'no-store',
      },
    );
    const passedThrough = PASSED_THROUGH_ERRORS[upstream.status];
    if (passedThrough) {
      const code = await upstreamErrorCode(upstream);
      return NextResponse.json({ error: passedThrough, code }, { status: upstream.status });
    }
    if (!upstream.ok) {
      console.error(
        `[admin/category-requests/approve] upstream responded with status ${upstream.status}`,
      );
      return upstreamFailure();
    }
    const parsed = approveResponseSchema.safeParse(await upstream.json());
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')} (${issue.code})`);
      console.error(
        `[admin/category-requests/approve] upstream response failed validation: ${issues.join(', ')}`,
      );
      return upstreamFailure();
    }
    return NextResponse.json(parsed.data);
  } catch (error) {
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error';
    console.error(`[admin/category-requests/approve] upstream request failed: ${reason}`);
    return upstreamFailure();
  }
}
